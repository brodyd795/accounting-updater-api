#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd ${DIR}

mysql -e "CREATE DATABASE IF NOT EXISTS NEW_accounting_DEV"
mysqldump NEW_accounting | mysql NEW_accounting_DEV

