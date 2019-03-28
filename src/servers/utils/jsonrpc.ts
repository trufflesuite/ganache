namespace JsonRpc {
    const jsonrpc = "2.0";
    type JsonRpc = {
        id: string,
        jsonrpc: string,
        toString(): string
    }
    export type Request = JsonRpc & {
        id: string,
        jsonrpc: string,
        method: string,
        params?: any[]
    };
    export type Response = JsonRpc & {
       result: any
    };
    export type Error = JsonRpc & {
        error: {
            code: string,
            message: any
        }
    };
    export const Request = (json: any): Request => {
        return {
            id: json.id,
            jsonrpc,
            method: json.method,
            params: json.params
        };
    }
    export const Response = (id: string, result: any): Response => {
        return {
            id: id,
            jsonrpc,
            result
        };
    }
    export const Error = (id: string, code: string, message: any): Error => {
        return {
            id,
            jsonrpc,
            error: {
                code,
                message
            }
        };
    }

}

export default JsonRpc;
