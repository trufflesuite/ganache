#!/bin/env bash

if [ "${LERNA_ROOT_PATH}" != "" ]; then
  PACKAGE_DIR=$(pwd)
  cd ${LERNA_ROOT_PATH}
  if [[ $# == 0 ]]; then
    ttsc --project ${PACKAGE_DIR}/tsconfig.json
  else
    ttsc $@
  fi
else
  ttsc
fi
