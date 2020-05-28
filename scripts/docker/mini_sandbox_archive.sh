#! /bin/sh

all_commands="
* usage | help | --help | -h: Display this help message."
usage () {
    cat >&2 <<EOF
This script provides a Flextesa “mini-net” sandbox with predefined
parameters useful for tutorials and basic exploration with
wallet software like \`tezos-client\`.

usage: $0 <command>

where <command> may be:
$all_commands
EOF
}

export flextesa_node_cors_origin="*"

all_commands="$all_commands
* start : Start the sandbox."
start () {
    flextesa mini \
             --root /tmp/mini-carthage --size 1 "$@" \
             --time-between-blocks 0 \
             --timestamp-delay 0 \
             --no-baking \
             --tezos-baker tezos-baker-006-PsCARTHA \
             --tezos-endorser tezos-endorser-006-PsCARTHA \
             --tezos-accuser tezos-accuser-006-PsCARTHA \
             --protocol-hash PsCARTHAGazKbHtnKfLzQg3kms52kSRpgnDY982a9oYsSXRLQEb \
             --protocol-kind Carthage \
             --set-history-mode N000:archive
}


if [ "$1" = "" ] || [ "$1" = "help" ] || [ "$1" = "--help" ] || [ "$1" = "-h" ] ; then
    usage
else
    "$@"
fi
