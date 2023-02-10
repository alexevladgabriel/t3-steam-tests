import type { NextApiRequest, NextApiResponse } from "next"
import NextAuth from "next-auth";
import { authOptions } from "../../../server/auth";

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await NextAuth(req, res, authOptions);
}