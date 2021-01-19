#!/bin/bash

_npmScriptsCompletions() {
  local cur_word args type_list first_arg

  cur_word="${COMP_WORDS[COMP_CWORD]}"
  args=("${COMP_WORDS[@]}")

  if [ "${COMP_WORDS[1]}" == "run" ] && [ ${#COMP_WORDS[@]} == 3 ]; then
    # get a list of all npm scripts and add them to the bash autocomplete reply
    # NODE_OPTIONS="" prevents vscode's Auto Attach feature from attaching to this node script
    type_list=$(NODE_OPTIONS="" node -pe "Object.keys(require('./package.json').scripts).join(' ')")
    COMPREPLY=($(compgen -W "${type_list}" -- ${cur_word}))
  else
    # if the command if the create command (npm run create) get its completion values
    if [ "${COMP_WORDS[1]}" == "run" ] && [ "${COMP_WORDS[2]}" == "create" ]; then
      while [[ "$#" -gt 0 ]]; do
        case $1 in
        -l | --location)
          type_list=$(cd src && find * chains/* -maxdepth 0 -type d && cd ../)
          shift
          ;;
        - | --l | --lo | --loc | --loca | --locat | --locati | --locatio)
          # autocomplete "-l" or "--location" (but only when we don't already have the full word)
          if [[ ! " ${COMP_WORDS[@]} " =~ " --location " ]] && [[ ! " ${COMP_WORDS[@]} " =~ " -l " ]]; then
            type_list="--location"
          fi
          shift
          ;;
        *) shift ;;
        esac
      done

      COMPREPLY=($(compgen -W "${type_list}" -- ${cur_word}))
    fi
  fi
  return 0
}
complete -o default -F _npmScriptsCompletions npm
