FROM node:20-bullseye

LABEL maintainer="Ibrahim Tanyalcin"
LABEL description="Spins up a express server \ 
for IGV to visualize .bam files"
LABEL version="0.3.1"
LABEL website="https://github.com/IbrahimTanyalcin/xpress-bio"
LABEL repository="https://github.com/IbrahimTanyalcin/xpress-bio"

WORKDIR /app
RUN ["/bin/bash", "-c", "apt-get -y update"]

COPY ./app/package*.json ./
COPY ./app/bin ./bin
COPY ./app/certs ./certs
RUN /bin/bash ./bin/installCerts.sh \
&& npm config set cafile /etc/ssl/certs/ca-certificates.crt \
&& npm install --omit=dev
COPY ./app ./
RUN rm -rf /app/certs
RUN /bin/bash ./bin/memcached.sh \
&& /bin/bash ./bin/bc.sh \
&& /bin/bash ./bin/misc-dependencies.sh \
&& /bin/bash ./bin/setLogname.sh \
&& /bin/bash ./bin/createUserAndGroup.sh \
&& /bin/bash ./bin/cleanUp.sh
# ENV LOGNAME="IPV" Alternative to setLogname.sh
ENV MOUNT_PATH="/app/mount"
EXPOSE 3000 

###############################################################################
##################################<SAMTOOLS>###################################
###############################################################################
ARG SAMTOOLS_VERSION=1.18
ARG INSTALL_SAMTOOLS=true
ARG TARGET_DIR=/home/IPV/.local/bin

# Conditional install
RUN if [ "$INSTALL_SAMTOOLS" = "true" ]; then /bin/bash ./bin/installSamtools.sh $SAMTOOLS_VERSION $TARGET_DIR; fi

# Update $PATH so that spawn/exec within Node can find it
ENV PATH="$PATH:$TARGET_DIR/samtools-$SAMTOOLS_VERSION:$TARGET_DIR/bcftools-$SAMTOOLS_VERSION:$TARGET_DIR/htslib-$SAMTOOLS_VERSION"
###############################################################################
##################################</SAMTOOLS>##################################
###############################################################################

###############################################################################
####################################<BLAST>####################################
###############################################################################
ARG BLAST_ARCH=x64-linux
ARG BLAST_VERSION=2.15.0
ARG INSTALL_BLAST=true

# Conditional install
RUN if [ "$INSTALL_BLAST" = "true" ]; then /bin/bash ./bin/installBlast.sh $BLAST_ARCH $BLAST_VERSION $TARGET_DIR; fi

# Update $PATH so that spawn/exec within Node can find it
ENV PATH="$PATH:$TARGET_DIR/ncbi-blast-$BLAST_VERSION+/bin"
###############################################################################
####################################<BLAST>####################################
###############################################################################

#USER IPV:IPV
#ENTRYPOINT ["npm", "start"]
ENTRYPOINT ["/bin/bash", "./bin/start.sh"]
#--npm for npm args
#--nodemon for nodemon args
#-- for node args
CMD ["--nodemon", "-e", "js,mjs,json,txt", "--ignore", "src/public/assets/\\*\\*/\\*", "--ignore", "js/server/token.config.json", "--ignore", "js/server/tokens.config.json", "--ignore", "js/server/secret.config.json", "--ignore", "js/server/secrets.config.json", "--ignore", "js/server/apikey.config.json", "--ignore", "js/server/apikeys.config.json", "--ignore", "js/server/apiKey.config.json", "--ignore", "js/server/apiKeys.config.json", "--use-openssl-ca", "--", "--no-daemon"]