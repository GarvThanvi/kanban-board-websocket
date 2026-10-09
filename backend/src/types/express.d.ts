import * as express from "express";
import type { Role } from "../middleware/boardAccess.middleware.ts";

declare global{
    namespace Express {
        interface Request {
            userId? : string,
            boardRole?: Role
        }
    }
}