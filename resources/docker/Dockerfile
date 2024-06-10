FROM node:16

LABEL maintainer="Ibrahim Tanyalcin"
LABEL description="Spins up a express server \ 
for IGV to visualize .bam files"
LABEL version="0.2.0"
LABEL website="https://dnanexus.gsk.com"
LABEL repository="https://dev.azure.com/DevOps-Vx/dna-nexus-igv"

WORKDIR /app
RUN ["/bin/bash", "-c", "apt-get -y update"]

COPY ./app/package*.json ./
RUN npm install --omit=dev
COPY ./app ./
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
ARG BLAST_ARCH=x64-linux.tar.gz
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
CMD ["--nodemon", "-e", "js,mjs,json,txt" , "--ignore", "src/public/assets/\\*\\*/\\*", "--", "--no-daemon"]