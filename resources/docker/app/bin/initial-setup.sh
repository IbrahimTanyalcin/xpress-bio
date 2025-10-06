#!/usr/bin/env bash
# initial-setup.sh
# Unified installer for Samtools/HTSlib/Bcftools and NCBI BLAST+
# - Dynamic user/group (replaces hardcoded IPV)
# - Selection via gum (with simple fallback)
# - Visible build output (no silencing of make)
# - Optional PATH updates
# - Safe as_user* wrappers that preserves args correctly

export DEBIAN_FRONTEND=noninteractive
APT_OPTS=(-o 'Dpkg::Use-Pty=0' -o 'APT::Color=0' -o 'Acquire::Retries=3')

#CONF_OPTS=( -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold )
CONF_OPTS=()
CURL_OPTS=(-fsSL --connect-timeout 15 --retry 3 --retry-all-errors)


DEBUG="${DEBUG:-false}"
SHA256SUMS=(
  dfddba968acf7fe1b6a8aa5e554b1bcec0cea643a509bae6fba618f653ac639e #gum 0.14.3 amd64
  c71d6ec30a466aff6450e15197bf4d3cc52d4dbb6d3895b9ca21c86d8cc3a5cd #gum 0.14.3 arm64
  198f7cc74788b4b93bfad74802c289ab3cde6a2ce9fe2c058feff0f6cb9876eb #gum 0.14.3 armhf
  d686ffa621023ba61822a2a50b70e85d0b18e79371de5adb07828519d3fc06e1 #samtools-1.18.tar.bz2
  d9b9d36293e4cc62ab7473aa2539389d4e1de79b1a927d483f6e91f3c3ceac7e #bcftools-1.18.tar.bz2
  f1ab53a593a2320a1bfadf4ef915dae784006c5b5c922c8a8174d7530a9af18f #htslib-1.18.tar.bz2
  c5c0b7029069fe5b9cd5913ae606c7f2aa901db8264ca92cfaf04e4d4768c054 #ncbi-blast-2.15.0+-x64-linux.tar.gz
  47ce417832e31366ec6835adc0c88a2e164f17e646dd025d7e4ddd263ad8ed51 #ncbi-blast-2.15.0+-aarch64-linux.tar.gz
)

if [[ "$1" == "--debug" ]]; then
  DEBUG=true
  shift
fi

if [[ "$DEBUG" == "true" ]]; then
  set -x
fi

set -e -o pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

### -------- Config (env-overridable) --------
SAMTOOLS_VERSION="${SAMTOOLS_VERSION:-1.18}"
BLAST_VERSION="${BLAST_VERSION:-2.15.0}"
BLAST_ARCH="${BLAST_ARCH:-auto}"        # e.g. x64-linux, aarch64-linux, x86_64-macosx, etc.
GUM_VERSION="${GUM_VERSION:-0.14.3}"

TARGET_USER="${TARGET_USER:-${SUDO_USER:-${USER:-$(whoami 2>/dev/null || id -u)}}}"
TARGET_GROUP="${TARGET_GROUP:-$(id -gn "$TARGET_USER")}"
TARGET_HOME="${TARGET_HOME:-$(getent passwd "$TARGET_USER" | cut -d: -f6)}"
TARGET_DIR="${TARGET_DIR:-$TARGET_HOME/.local/bin}"

NO_GUM="${NO_GUM:-false}"        # true = skip gum even if available
SELECTIONS="${SELECTIONS:-}"     # non-interactive: "samtools", "blast", or "samtools,blast"
AUTO_PATH="${AUTO_PATH:-true}"   # true = append PATH exports to ~/.bashrc
INSTALL_BUILD_DEPS="${INSTALL_BUILD_DEPS:-true}"  # true = install full toolchain (recommended)

LOG_DIR="${LOG_DIR:-$SCRIPT_DIR/logs}"

#ANSI control constructs
logRED='\033[0;31m'
logGREEN='\033[0;32m' 
logBLUE='\033[0;34m'
logCYAN='\033[0;36m' 
logNEUT='\033[0m'
logBLACK='\033[0;30m'
logYELLOW='\033[0;33m'
logYELLOWBG='\033[43m'
logORANGE='\033[38;5;208m'
clearLINE='\033[K'

print_banner() {
  local banner="$(sed -E 's/^[[:space:]]{0,4}//' <<-'EOL'
    __  __                              ____  _       
    \ \/ /_ __  _ __ ___  ___ ___      | __ )(_) ___  
     \  /| '_ \| '__/ _ \/ __/ __|_____|  _ \| |/ _ \ 
     /  \| |_) | | |  __/\__ \__ \_____| |_) | | (_) |
    /_/\_\ .__/|_|  \___||___/___/     |____/|_|\___/ 
         |_|                                          
EOL
  )"

  echo -e "${logGREEN}${banner}${logNEUT}"
  echo
}


includes() {
  local -a all_args=("$@")
  local needle="${all_args[0]}"
  local -a haystack=("${all_args[@]:1}")
  local item
  for item in "${haystack[@]}"; do
    [[ "$item" == "$needle" ]] && return 0
  done
  return 1
}

_has() {
    type "$1" > /dev/null 2>&1
}

issueInfo() {
    local dCarets uCarets formatString modifiedArgs
    dCarets=$(printf "%.0s˅" {1..36})
    uCarets=$(printf "%.0s˄" {1..36})
    for _ in "${@}"; do
        formatString+="%s\n"
    done
    modifiedArgs=("${@}")
    modifiedArgs=("${modifiedArgs[@]/#/>    }")
    printf "${logCYAN}${dCarets}::INFO::${dCarets}\n"
    printf "${formatString}" "${modifiedArgs[@]}"
    printf "${uCarets}::::::::${uCarets}${logNEUT}\n"
}

issueSuccess() {
    local dCarets uCarets dCaretsR uCaretsR formatString modifiedArgs
    dCarets=$(printf "%.0s˅" {1..36})
    uCarets=$(printf "%.0s˄" {1..36})
    dCaretsR=$(printf "%.0s˅" {1..33})
    uCaretsR=$(printf "%.0s˄" {1..33})
    for _ in "${@}"; do
        formatString+="%s\n"
    done
    modifiedArgs=("${@}")
    modifiedArgs=("${modifiedArgs[@]/#/>    }")
    printf "${logGREEN}${dCarets}::SUCCESS::${dCaretsR}\n"
    printf "${formatString}" "${modifiedArgs[@]}"
    printf "${uCarets}:::::::::::${uCaretsR}${logNEUT}\n"
}

issueWarning() {
    local dCarets uCarets dCaretsR uCaretsR formatString modifiedArgs
    dCarets=$(printf "%.0s˅" {1..36})
    uCarets=$(printf "%.0s˄" {1..36})
    dCaretsR=$(printf "%.0s˅" {1..33})
    uCaretsR=$(printf "%.0s˄" {1..33})
    for _ in "${@}"; do
        formatString+="%s\n"
    done
    modifiedArgs=("${@}")
    modifiedArgs=("${modifiedArgs[@]/#/>    }")
    printf "${logORANGE}${dCarets}::WARNING::${dCaretsR}\n"
    printf "${formatString}" "${modifiedArgs[@]}"
    printf "${uCarets}:::::::::::${uCaretsR}${logNEUT}\n"
}

### -------- Helpers --------
#breaks sourcing files
#as_user() {
#  # Re-quote args safely into a single command string for bash -lc
#  local cmd
#  printf -v cmd '%q ' "$@"
#  cmd=${cmd% }
#  sudo -u "$TARGET_USER" -H bash -lc "$cmd"
#}

is_tty() { [[ -t 1 ]] && [[ -n "${TERM:-}" ]] && [[ "$TERM" != "dumb" ]]; }
pushd_q() { command pushd "$@" >/dev/null; }
popd_q()  { command popd  "$@" >/dev/null; }

#Usage spinner:
#  Foreground
#    start_spinner "Installing system dependencies..."
#    trap 'ret=$?; stop_spinner "$ret"' EXIT
#    apt-get "${APT_OPTS[@]}" "${CONF_OPTS[@]}" update &>>"$LOG_FILE"
#    trap - EXIT
#    stop_spinner $?
#  Background
#    start_spinner "Installing base tools"
#    trap 'ret=$?; stop_spinner "$ret"' EXIT
#    apt-get "${APT_OPTS[@]}" "${CONF_OPTS[@]}" install -y curl ... &>>"$LOG_FILE" &
#    pid=$!
#    wait "$pid"; rc=$?
#    trap - EXIT
#    stop_spinner "$rc"

start_spinner() {
  # Log to logfile before tty short circuit
  SPINNER_MSG="$*"
  local stamp="$(date -Is)"
  local step_id="$(tr -cd '[:alnum:]_. -' <<<"$SPINNER_MSG" | tr ' ' '_' )"

  # Delimit sections in the single logfile
  {
    printf '\n===== [%s] %s =====\n' "$step_id" "$stamp"
  } >>"$LOG_FILE"

  is_tty || return 0

  # Kill existing spinner if running
  if [[ -n "${SPINNER_PID:-}" ]] && kill -0 "$SPINNER_PID" 2>/dev/null; then
    kill "$SPINNER_PID" 2>/dev/null; wait "$SPINNER_PID" 2>/dev/null || true
  fi

  # Frames: Unicode dots if available, else ASCII
  if printf '⠋' | iconv -f UTF-8 -t UTF-8 >/dev/null 2>&1; then
    local frames=(⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏)
  else
    local frames=(- \\ \| /)
  fi

  local i=0
  while :; do
    printf "\r${clearLINE}%s %s" "$SPINNER_MSG" "${frames[i]}"
    i=$(( (i+1) % ${#frames[@]} ))
    sleep 0.1
  done & SPINNER_PID=$!
}

stop_spinner() {
  is_tty || return 0
  local return_code="${1:-0}"   # optional; default success

  if [[ -n "${SPINNER_PID:-}" ]] && kill -0 "$SPINNER_PID" 2>/dev/null; then
    kill "$SPINNER_PID" 2>/dev/null; wait "$SPINNER_PID" 2>/dev/null || true
    unset SPINNER_PID

    # pick status glyphs (fallback to ASCII if no UTF-8)
    if printf '✓' | iconv -f UTF-8 -t UTF-8 >/dev/null 2>&1; then
      local ok='✓' fail='✗'
    else
      local ok='OK' fail='ERR'
    fi

    if (( return_code == 0 )); then
      printf "\r${clearLINE}%s %s\n" "$SPINNER_MSG" "$ok"
    else
      printf "\r${clearLINE}%s %s(%s)\n" "$SPINNER_MSG" "$fail" "$return_code"
    fi
    unset SPINNER_MSG
  fi
}

as_user_sh() {
  if [[ "$TARGET_USER" == "root" ]]; then
    bash -lc "$*";
  else
    # Run the provided string exactly as a shell command for TARGET_USER
    sudo -u "$TARGET_USER" -H bash -lc "$*";
  fi
}
as_user_exec() {
  if [[ "$TARGET_USER" == "root" ]]; then
    "$@";
  else
    #Dont need to escape special chars or single quotes like '"'"' etc
    sudo -u "$TARGET_USER" -H -- "$@"
  fi
}
as_root_exec() {
  if [[ "$TARGET_USER" == "root" ]]; then
    "$@";
  else
    #Dont need to escape special chars or single quotes like '"'"' etc
    sudo -u "root" -H -- "$@"
  fi
}

backup_rc() {
  [[ "$AUTO_PATH" != "true" ]] && return 0

  local rc
  if [[ -f "$TARGET_HOME/.bashrc" ]]; then
    rc="$TARGET_HOME/.bashrc"
  elif [[ -f "$TARGET_HOME/.zshrc" ]]; then
    rc="$TARGET_HOME/.zshrc"
  else
    rc="$TARGET_HOME/.profile"
  fi

  # if rc was not set or does not exist then abort
  if [[ -z "$rc" || ! -f "$rc" ]]; then
    issueWarning "No rc file found to back up."
    return 0
  fi

  local timeStamp="$(date +%Y%m%d).$(date +%s)"
  local bck="${rc}.bck.${timeStamp}"

  cp -a -- "$rc" "$bck" || {
    issueWarning "Failed to back up $rc"
    return 1
  }

  issueInfo "Backed up $rc → $bck" "If everything works, you can safely delete the backup."
}

maintain_rc_entry() {
  local rc="$1" tool="$2" newEntry="$3"
  local begin="# BEGIN XPRESS-BIO ${tool^^} PATH (managed)"
  local end="# END XPRESS-BIO ${tool^^} PATH (managed)"
  local tmp; tmp="$(as_user_exec mktemp -p "$(dirname -- "$rc")" .rc.XXXXXX)" || return 1

  as_user_exec mkdir -p -- "$(dirname -- "$rc")"
  as_user_exec touch -- "$rc"

  # NOTE: This normalizes CRLF -> LF by stripping trailing \r on each line.
  LC_ALL=C awk -v B="$begin" -v E="$end" -v NEW="$newEntry" '
    BEGIN { inblk=0; seen=0 }
    {
      sub(/\r$/, "")          # strip CR at EOL (CRLF -> LF)
    }
    $0==B {
      if (!seen) {
        seen=1; inblk=1
        print B
        printf "%s", NEW
        if (NEW !~ /\n$/) print ""   # ensure newline after payload
        print E
        # skip old block until E (or EOF if malformed)
        while (getline l) {
          sub(/\r$/, "", l)
          if (l==E) { inblk=0; break }
        }
        next
      } else {
        # consume duplicate blocks entirely
        inblk=1
        while (getline l) {
          sub(/\r$/, "", l)
          if (l==E) { inblk=0; break }
        }
        next
      }
    }
    $0==E { next }
    !inblk { print }
    END {
      if (!seen) {
        print B
        printf "%s", NEW
        if (NEW !~ /\n$/) print ""   # ensure newline after payload
        print E
      }
    }
  ' "$rc" > "$tmp" || { rm -f "$tmp"; return 1; }

  # Preserve owner/perm of rc when swapping
  chown --reference="$rc" "$tmp" 2>/dev/null || true
  chmod --reference="$rc" "$tmp" 2>/dev/null || true
  mv -f -- "$tmp" "$rc"
}

###--------------Greet--------------
print_banner

### -------- Root/OS checks --------
if ! _has sudo; then
  issueWarning "This script requires sudo. Install sudo and retry."
  exit 1
fi
if [[ $EUID -ne 0 ]]; then
  issueWarning "Run with sudo/root. Abort."
  exit 1
fi

if [[ -z "$TARGET_HOME" ]]; then
  issueWarning "Could not determine HOME for $TARGET_USER"; exit 1
fi

if ! grep -qiE 'debian|ubuntu' /etc/os-release; then
  issueWarning "This script targets Debian/Ubuntu. Abort."; exit 1
fi

if [[ "${SELECTIONS,,}" == "none" ]]; then
  issueInfo "Nothing selected. Exiting."; exit 0
fi


as_user_exec mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_FILE:-$(as_user_exec mktemp -p "$LOG_DIR" initial-setup.XXXXXX.log)}"
: > "$LOG_FILE";
issueInfo "Logging to: $LOG_FILE"

is_cmd() { command -v "$1" >/dev/null 2>&1; }

run_step() {
  # usage: run_step "Title…" bash -lc 'cmd && ...'
  local title="$1"; shift
  local stamp="$(date -Is)"
  local step_id="$(tr -cd '[:alnum:]_. -' <<<"$title" | tr ' ' '_' )"

  # Delimit sections in the single logfile
  {
    printf '\n===== [%s] %s =====\n' "$step_id" "$stamp"
  } >>"$LOG_FILE"

  if is_cmd gum && [[ "$NO_GUM" != "true" ]]; then
    # No --show-output => spinner stays put. We log + mirror live to TTY.
    if LOG="$LOG_FILE" gum spin --spinner dot --title "$title" -- bash -c '
         set -e -o pipefail
         { "$@"; } > >(tee -a "$LOG") 2> >(tee -a "$LOG" >&2)
       ' _ "$@"
    then
      : # ok
    else
      printf '\n'; issueWarning "Step failed — last 200 lines of $LOG_FILE:"; tail -n 200 "$LOG_FILE"
      return 1
    fi
  else
    # Fallback: still capture a log, but stream live.
    { "$@" |& tee -a "$LOG_FILE"; }
  fi
}

run_step_block() {
  # usage: run_step_block "Title..." <<'SH'
  #   ...your commands...
  # SH
  local title="$1"; shift
  if is_cmd gum && [[ "$NO_GUM" != "true" ]]; then
    gum spin --spinner dot --title "$title" --show-output -- bash -lc "$(cat)"
  else
    bash -lc "$(cat)"
  fi
}

### -------- System deps --------
issueInfo "Installing system dependencies..."
start_spinner "Installing system dependencies..."
trap 'ret=$?; stop_spinner "$ret"' EXIT
apt-get "${APT_OPTS[@]}" "${CONF_OPTS[@]}" update &>>"$LOG_FILE"
# Base tools
start_spinner "Installing base tools..."
apt-get "${APT_OPTS[@]}" "${CONF_OPTS[@]}" install -y curl ca-certificates tar bzip2 gzip xz-utils coreutils wget \
  liblz4-tool lz4 bsdmainutils bsdextrautils bc \
  memcached libmemcached-tools \
  &>>"$LOG_FILE"
# Build deps for samtools/htslib
if [[ "$INSTALL_BUILD_DEPS" == "true" ]]; then
  # add libncurses-dev (fixes missing samtools binary due to tview link failure)
  start_spinner "Installing samtools/htslib build dependencies..."
  apt-get "${APT_OPTS[@]}" "${CONF_OPTS[@]}" install -y build-essential pkg-config zlib1g-dev libbz2-dev liblzma-dev libcurl4-openssl-dev libncurses-dev &>>"$LOG_FILE"
else
  # Minimal like your originals (still ensure ncurses headers to avoid link failures)
  start_spinner "Installing minimal build dependencies..."
  apt-get "${APT_OPTS[@]}" "${CONF_OPTS[@]}" install -y libcurl4-openssl-dev libncurses-dev &>>"$LOG_FILE" || true
fi
_temp_return_code=$?
trap - EXIT
stop_spinner "$_temp_return_code"
issueSuccess "Installed system dependencies"

issueInfo "Setting up target install directory:" "$TARGET_DIR"
#mkdir -p "$TARGET_DIR"
#chown -R "$TARGET_USER:$TARGET_GROUP" "$TARGET_DIR"
as_user_exec mkdir -p "$TARGET_DIR"
chmod 775 "$TARGET_DIR"
issueSuccess "Created $TARGET_DIR:" "$(ls -lah "$TARGET_DIR")"

### -------- gum (interactive picker) --------
install_gum() {
  local arch pkg
  arch="$(dpkg --print-architecture)"
  case "$arch" in
    amd64) pkg="gum_${GUM_VERSION}_amd64.deb" ;;
    arm64) pkg="gum_${GUM_VERSION}_arm64.deb" ;;
    armhf) pkg="gum_${GUM_VERSION}_armhf.deb" ;;
    *)     pkg="gum_${GUM_VERSION}_amd64.deb" ;;
  esac
  pushd_q "/tmp"
  start_spinner "Downloading gum ${pkg}"
  trap 'ret=$?; stop_spinner "$ret"' EXIT
  wget -qO gum.deb "https://github.com/charmbracelet/gum/releases/download/v${GUM_VERSION}/${pkg}"
  start_spinner "Verifying checksum"
  includes "$(sha256sum -- "./gum.deb" | awk '{print $1}')" "${SHA256SUMS[@]}"
  start_spinner "Installing gum from deb file"
  apt-get install -y --allow-downgrades ./gum.deb &>>"$LOG_FILE"
  start_spinner "Cleaning up deb file"
  rm -f gum.deb
  _temp_return_code=$?
  trap - EXIT
  stop_spinner "$_temp_return_code"
  popd_q 
}

if [[ "$NO_GUM" != "true" ]] && is_tty && ! is_cmd gum; then
  issueInfo "Installing GUM" 
  install_gum
  issueSuccess "Installed GUM"
fi

# Non-interactive default: if no SELECTIONS and stdin is not a TTY, install both
if [[ -z "$SELECTIONS" && ! -t 0 ]]; then SELECTIONS="samtools,blast"; fi

# Choose what to install
CHOSEN=()
if [[ -n "$SELECTIONS" ]]; then
  IFS=',' read -r -a CHOSEN <<< "$SELECTIONS"
else
  if is_cmd gum && [[ "$NO_GUM" != "true" ]]; then
    echo -e "Bio tools installer\nPick what to install (space to toggle, enter to confirm):"
    mapfile -t CHOSEN < <(gum choose --no-limit "samtools" "blast")
  else
    echo "Install Samtools (s), BLAST (b), or both (sb)? [s/b/sb/none] "
    read -r ans
    case "$ans" in
      s) CHOSEN=("samtools");;
      b) CHOSEN=("blast");;
      sb) CHOSEN=("samtools" "blast");;
      *) CHOSEN=();;
    esac
  fi
fi

[[ ${#CHOSEN[@]} -gt 0 ]] || { echo "Nothing selected. Exiting."; exit 0; }

### -------- Installers (visible output; keep your build flow) --------
install_samtools() {
  local v="$1" dest="$2"

  mkdir -p "$dest"
  pushd_q "$dest"

  run_step "Downloading samtools ${v}" curl "${CURL_OPTS[@]}" -O "https://github.com/samtools/samtools/releases/download/${v}/samtools-${v}.tar.bz2"
  run_step "Downloading bcftools ${v}" curl "${CURL_OPTS[@]}" -O "https://github.com/samtools/bcftools/releases/download/${v}/bcftools-${v}.tar.bz2"
  run_step "Downloading htslib ${v}" curl "${CURL_OPTS[@]}" -O "https://github.com/samtools/htslib/releases/download/${v}/htslib-${v}.tar.bz2"

  start_spinner "Verifying checksums"
  trap 'ret=$?; stop_spinner "$ret"; issueWarning "Checksum verification of samtools/bcftools/htslib failed";' EXIT
  includes "$(sha256sum -- "htslib-${v}.tar.bz2" | awk '{print $1}')" "${SHA256SUMS[@]}"
  includes "$(sha256sum -- "samtools-${v}.tar.bz2" | awk '{print $1}')" "${SHA256SUMS[@]}"
  includes "$(sha256sum -- "bcftools-${v}.tar.bz2" | awk '{print $1}')" "${SHA256SUMS[@]}"
  _temp_return_code=$?
  trap - EXIT
  stop_spinner "$_temp_return_code"

  run_step "Extracting htslib ${v}" tar -xvjf "htslib-${v}.tar.bz2"
  run_step "Extracting samtools ${v}" tar -xvjf "samtools-${v}.tar.bz2"
  run_step "Extracting bcftools ${v}" tar -xvjf "bcftools-${v}.tar.bz2"
  run_step "Cleaning up tarballs" rm -f "htslib-${v}.tar.bz2" "samtools-${v}.tar.bz2" "bcftools-${v}.tar.bz2"

  # parallel builds + safe fallback for samtools if curses linking fails
  run_step "building bcftools" \
    bash -lc 'pushd "bcftools-'"${v}"'" && stdbuf -oL -eL make -j"$(nproc 2>/dev/null || echo 2)" 2>&1'
  run_step "building htslib" \
    bash -lc 'pushd "htslib-'"${v}"'" && stdbuf -oL -eL make -j"$(nproc 2>/dev/null || echo 2)" 2>&1'
  run_step "building samtools" \
    bash -lc '
      pushd "samtools-'"${v}"'"
      if ! stdbuf -oL -eL make -j"$(nproc 2>/dev/null || echo 2)"; then
        echo "samtools build failed; retrying with no_tview=1 (disables curses tview)…"
        make clean || true
        stdbuf -oL -eL make -j"$(nproc 2>/dev/null || echo 2)" no_tview=1 2>&1
      fi
    '

  issueInfo "Setting up permissions for bcftools, htslib and samtools"
  for tool in bcftools htslib samtools; do
    chown -R "root:${TARGET_GROUP}" "$dest/${tool}-${v}"
    chmod -R 775 "$dest/${tool}-${v}"
    find "$dest/${tool}-${v}" -type f -print0 | xargs -0r chmod 774
  done

  popd_q

  issueInfo "Exporting to \$PATH..." "$dest/bcftools-${v}" "$dest/samtools-${v}" "$dest/htslib-${v}" 
  if [[ "$AUTO_PATH" == "true" ]]; then
    # Prefer .bashrc; if absent, fall back to .zshrc, then .profile
    local rc
    if [[ -f "$TARGET_HOME/.bashrc" ]]; then
      rc="$TARGET_HOME/.bashrc"
    elif [[ -f "$TARGET_HOME/.zshrc" ]]; then
      rc="$TARGET_HOME/.zshrc"
    else
      rc="$TARGET_HOME/.profile"
    fi
    touch "$rc"
    chown "$TARGET_USER:$TARGET_GROUP" "$rc"
    #replaced in favor of maintain_rc_entry
    #for p in "bcftools-${v}" "samtools-${v}" "htslib-${v}"; do
    #  if ! sudo -u "$TARGET_USER" grep -Fq "$dest/$p" "$rc" 2>/dev/null; then
    #    echo "export PATH=\"\$PATH:$dest/$p\"" >> "$rc"
    #  fi
    #done
    local entries=()
    for p in "bcftools-${v}" "samtools-${v}" "htslib-${v}"; do
        entries+=("export PATH=\"\$PATH:$dest/$p\"")
    done
    start_spinner "Writing samtools managed block to $rc"
    trap 'ret=$?; stop_spinner "$ret"; issueWarning "Writing samtools managed block to .rc failed";' EXIT
    maintain_rc_entry "$rc" "samtools/htslib/bcftools" "$(printf "%s\n" "${entries[@]}")"
    _temp_return_code=$?
    trap - EXIT
    stop_spinner "$_temp_return_code"
  fi

  issueSuccess "Installed Samtools ${v}"
}

install_blast() {
  local arch="$1" v="$2" dest="$3"
  local dpkg_arch

  issueInfo "Checking architecture for blast"
   # Map dpkg arch -> NCBI tarball arch when "auto"
  if [[ "$arch" == "auto" ]]; then
    dpkg_arch="$(dpkg --print-architecture 2>/dev/null || echo amd64)"
    case "$dpkg_arch" in
      amd64)   arch="x64-linux" ;;
      arm64)   arch="aarch64-linux" ;;
      *)
        echo "Unsupported architecture for BLAST on Linux: $dpkg_arch. Available: x64-linux, aarch64-linux." >&2
        exit 1
        ;;
    esac
  fi

  local base="https://ftp.ncbi.nlm.nih.gov/blast/executables/blast+"
  local tarball="ncbi-blast-${v}+-$arch.tar.gz"

  mkdir -p "$dest"
  pushd_q "$dest"

  run_step "Downloading blast+ ${v}" curl "${CURL_OPTS[@]}" -O "${base}/${v}/${tarball}"

  start_spinner "Verifying ${tarball} checksum"
  trap 'ret=$?; stop_spinner "$ret"; issueWarning "Checksum verification of blastn failed";' EXIT
  includes "$(sha256sum -- "${tarball}" | awk '{print $1}')" "${SHA256SUMS[@]}"
  _temp_return_code=$?
  trap - EXIT
  stop_spinner "$_temp_return_code"

  run_step "Extracting blast+ ${v}" tar -xvzf "${tarball}"
  run_step "Cleaning up tarballs" rm -f "${tarball}"

  issueInfo "Setting up permissions for blast+ ${v}"
  for tool in ncbi-blast; do
    chown -R "root:${TARGET_GROUP}" "$dest/${tool}-${v}+"
    find "$dest/${tool}-${v}+" -type d -print0 | xargs -0r chmod 755
    find "$dest/${tool}-${v}+/bin" -type f -print0 | xargs -0r chmod 774
  done

  popd_q

  issueInfo "Exporting to \$PATH..." "$dest/ncbi-blast-${v}+/bin"
  if [[ "$AUTO_PATH" == "true" ]]; then
    local rc
    if [[ -f "$TARGET_HOME/.bashrc" ]]; then
      rc="$TARGET_HOME/.bashrc"
    elif [[ -f "$TARGET_HOME/.zshrc" ]]; then
      rc="$TARGET_HOME/.zshrc"
    else
      rc="$TARGET_HOME/.profile"
    fi
    touch "$rc"
    chown "$TARGET_USER:$TARGET_GROUP" "$rc"
    local bin_path="$dest/ncbi-blast-${v}+/bin"
    #if ! sudo -u "$TARGET_USER" grep -Fq "$bin_path" "$rc" 2>/dev/null; then
    #  echo "export PATH=\"\$PATH:$bin_path\"" >> "$rc"
    #fi

    start_spinner "Writing blastn managed block to $rc"
    trap 'ret=$?; stop_spinner "$ret"; issueWarning "Writing blastn managed block to .rc failed";' EXIT
    maintain_rc_entry "$rc" "blastn" "export PATH=\"\$PATH:$bin_path\""
    _temp_return_code=$?
    trap - EXIT
    stop_spinner "$_temp_return_code"
  fi

  issueSuccess "Installed Blast+ ${v}"
}

### -------- Execute --------
start_spinner "Backing up rc file if any"
trap 'ret=$?; stop_spinner "$ret"; issueWarning "Backing up rc file failed";' EXIT
backup_rc
_temp_return_code=$?
trap - EXIT
stop_spinner "$_temp_return_code"

for pick in "${CHOSEN[@]}"; do
  case "$pick" in
    samtools) issueInfo "Starting to install samtools"; install_samtools "$SAMTOOLS_VERSION" "$TARGET_DIR" ;;
    blast)    issueInfo "Starting to install blast"; install_blast "$BLAST_ARCH" "$BLAST_VERSION" "$TARGET_DIR" ;;
    *) echo "Unknown selection: $pick" ;;
  esac
done

### -------- Verify (show tool versions if on PATH) --------
if [[ "$AUTO_PATH" == "true" ]]; then
  # pick the RC we actually edited earlier
  RC="$TARGET_HOME/.bashrc"
  if [[ ! -f "$RC" && -f "$TARGET_HOME/.zshrc" ]]; then
    RC="$TARGET_HOME/.zshrc"
  elif [[ ! -f "$RC" && -f "$TARGET_HOME/.profile" ]]; then
    RC="$TARGET_HOME/.profile"
  fi
  as_user_sh "source '$RC' >/dev/null 2>&1 || true; command -v samtools >/dev/null && samtools --version | head -1 || true"
  as_user_sh "source '$RC' >/dev/null 2>&1 || true; command -v blastn   >/dev/null && blastn -version    | head -1 || true"
fi

issueSuccess "Done. If PATH didn't update, run one of:" "source ~/.bashrc" "source ~/.zshrc" "source ~/.profile"

### -------- Generate server/initial-setup.config.json (if running from project bin) --------
{
  # Find this script’s directory and the server dir next to it: ../js/server
  script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
  server_dir="$script_dir/../js/server"

  if [[ -d "$server_dir" ]]; then
    cfg="$server_dir/initial-setup.config.json"
    # optional: back up existing file
    [[ -f "$cfg" ]] && cp -a "$cfg" "$cfg.bck.$(date +%Y%m%d%H%M%S)" || true

    cat >"$cfg" <<EOF
{
  "executables": {
    "samtools": [
      "$TARGET_HOME/.local/bin/samtools-$SAMTOOLS_VERSION"
    ],
    "bgzip": [
      "$TARGET_HOME/.local/bin/htslib-$SAMTOOLS_VERSION"
    ],
    "tabix": [
      "$TARGET_HOME/.local/bin/htslib-$SAMTOOLS_VERSION"
    ],
    "blastn": [
      "$TARGET_HOME/.local/bin/ncbi-blast-$BLAST_VERSION+/bin"
    ]
  }
}
EOF

    chown "$TARGET_USER:$TARGET_GROUP" "$cfg"
    issueInfo "Wrote $cfg"
  else
    issueInfo "Note: $server_dir not found; skipping initial-setup.config.json generation."
  fi
}

### -------- Start memcached if havent started yet --------
{
  start_spinner "Starting memcached"
  trap 'ret=$?; stop_spinner "$ret"; issueWarning "Starting memcached failed";' EXIT
  if as_root_exec service memcached status >/dev/null 2>&1; then
    _temp_return_code=$?
    stop_spinner "$_temp_return_code"
    issueInfo "Memcached is already running"
  else
    if as_root_exec service memcached start; then
      _temp_return_code=$?
      stop_spinner "$_temp_return_code"
      issueSuccess "Memcached started"
    else
      _temp_return_code=$?
      stop_spinner "$_temp_return_code"
      issueWarning "Memcached failed to start"
    fi
  fi
  trap - EXIT
} |& tee -a "$LOG_FILE"