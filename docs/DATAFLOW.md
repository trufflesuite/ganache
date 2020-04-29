Render at https://www.planttext.com/

```uml
@startuml

title Ganache Core Data Flow \n

start

:Server;

:HttpServer/WebsocketServer;

:Provider;

note left
    Ethereum, Tezos, etc.
    `request(method: string, params: any[])`
end note

:RequestCoordinator;

note left
    Lets us limit how many simultenous requests we process.
end note

:Executor;

note left
    Ensures the requested RPC is a valid Ledger endpoint
end note

:Ledger;

note left
    Executes the request. Implementation dependent.
end note

stop

@enduml
```
