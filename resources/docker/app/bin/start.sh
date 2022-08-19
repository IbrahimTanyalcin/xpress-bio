#!/bin/bash
service memcached start
su - IPV -s /bin/bash -c "cd /app && npm start $*"
#npm start "$@"