# PatScanUI docker image
# VERSION 0.1.0
FROM alpine:latest
LABEL  maintainer="Kai Blin <kblin@biosustain.dtu.dk>"

RUN apk add --no-cache python py-pip && pip install virtualenv && rm -rf /var/cache/apk/*

ADD http://dl.secondarymetabolites.org/historic/patscan /usr/local/bin/
RUN chmod a+x /usr/local/bin/patscan

RUN virtualenv /env && /env/bin/pip install Flask gunicorn

ADD . /app/
WORKDIR /app

EXPOSE 8000
VOLUME ["/data", "/store", "/app"]

ENTRYPOINT ["/env/bin/gunicorn"]
CMD ["-b", "0.0.0.0", "patscanui:app"]
