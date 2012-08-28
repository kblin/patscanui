#!/bin/bash

TIMEOUT=1
FILESTORE=/memdisk/store

CMD="find $FILESTORE -type f -mmin +$TIMEOUT -delete -print"

$CMD
