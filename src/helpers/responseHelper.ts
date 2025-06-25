import { Response } from "express";

export function handleServiceResult(res: Response, result: any, successMessage: string, errorMessage: string, successStatus = 201, errorStatus = 400) {
    if (result.error) {
        return res.status(errorStatus).json({
            message: errorMessage,
            error: result.error,
        });
    }
    return res.status(successStatus).json({
        message: successMessage,
        data: result.data,
    });
}
