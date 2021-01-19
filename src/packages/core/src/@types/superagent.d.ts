// superagent TS def has issues with these browser APIs not being available in
// node.
// error TS2304: Cannot find name 'XMLHttpRequest'
declare interface XMLHttpRequest {}
// error TS2304: Cannot find name 'Blob'
declare interface Blob {}
