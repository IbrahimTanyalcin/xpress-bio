FROM node:16

LABEL maintainer="Ibrahim Tanyalcin"
LABEL description="Spins up a express server \ 
for IGV to visualize .bam files"
LABEL version="0.0.4"
LABEL website="https://dnanexus.gsk.com"
LABEL repository="https://dev.azure.com/DevOps-Vx/dna-nexus-igv"

WORKDIR /app
RUN ["/bin/bash", "-c", "apt-get -y update"]

COPY ./app/package*.json ./
RUN npm install
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
#USER IPV:IPV
#ENTRYPOINT ["npm", "start"]
ENTRYPOINT ["/bin/bash", "./bin/start.sh"]
#--npm for npm args
#--nodemon for nodemon args
#-- for node args
CMD ["--nodemon", "-e", "js,mjs,json,txt" ,"--", "--no-daemon"]