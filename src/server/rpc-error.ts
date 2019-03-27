export default function rpcError(id: string, code: string, msg: any) {
    return JSON.stringify({
        jsonrpc: "2.0",
        id: id,
        error: {
        code: code,
        message: msg
        }
    });
}