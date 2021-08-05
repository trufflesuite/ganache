### Request Flow Sequence Diagram

<!-- NOTE: if you change this diagram, change the UML as well -->

![Request Flow Sequence Diagram](https://www.planttext.com/api/plantuml/svg/VPB1RiCW38RlUGhKUzJxD4sfgXrsg_O65bWDKceoSDezVar825HjJo3__uVD3rrWy3nTXcQKrMex0h7QTMSWq3tkjVEuKn3KKJPD-pMlwaDv_9imS0EQxHKOawwIFDk8KBFpufMJGzGAxo9ASK4-sxPYF8PfOD4DFiMUzUc1pF2sqUeLyEJTrHhqsrr-uJRRChrQvghQ2A6_wMmfve3_g2V6nPBHf2zLjTe5F9n-XBeWzyvaEMEYvcAcOZG9ar16Hs4xjmYdHFEa4SsZFj05MqsxfHJfAgQ2B-WgfbUFkP8ldZCHlXgpiihdwf2CVDGx)

<!--
@startuml
participant "@ganache/core" as Core
-> Core : request
activate Core
  Core -> Connector : parse
  activate Connector
    Core <-- Connector : result
  deactivate Connector
  Core -> Connector : handle
  activate Connector
    Connector -> Provider : requestRaw
    activate Provider
      Provider -> Engine : execute
      activate Engine
        Engine -> API : method
        activate API
          Engine <-- API : response
        deactivate API
        Provider <-- Engine : response
      deactivate Engine
      Connector <-- Provider : response
    deactivate Provider
    Core <-- Connector : response
  deactivate Connector
  <-- Core : response
deactivate Core
@enduml
-->
