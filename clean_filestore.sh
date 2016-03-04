#!/bin/sh

TIMEOUT=1
FILESTORE=/store

find $FILESTORE -type f -mmin +$TIMEOUT -delete -print
