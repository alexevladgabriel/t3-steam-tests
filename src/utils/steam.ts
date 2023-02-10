import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth";
import { TokenSet } from "openid-client";
import { v4 as uuidv4 } from "uuid";

export interface SteamProfile extends Record<string, any> {
    id: string;
    /** It will continue when I have a json list */
}

export default function Steam<P extends SteamProfile>(
  options: OAuthUserConfig<P>
): OAuthConfig<P> {
  return         {
    id: "steam",
    name: "Steam",
    type: "oauth",
    authorization: {
        url: "https://steamcommunity.com/openid/login",
        params: {
            "openid.ns": "http://specs.openid.net/auth/2.0",
            "openid.mode": "checkid_setup",
            "openid.return_to": `${options.clientId}/api/v1/auth/callback/steam`,
            "openid.realm": `${options.clientId}`,
            "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
            "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
        }
    },
    token: {
        async request(ctx) {
            console.log(ctx);
            const token_params = {
                "openid.assoc_handle": req.query["openid.assoc_handle"],
                "openid.signed": req.query["openid.signed"],
                "openid.sig": req.query["openid.sig"],
                "openid.ns": "http://specs.openid.net/auth/2.0",
                "openid.mode": "check_authentication",
            };
            for (const val of req.query["openid.signed"].split(",")) {
                //@ts-ignore
                token_params[`openid.${val}`] = req.query[`openid.${val}`];
            }
            const token_url = new URL("https://steamcommunity.com/openid/login");
            const token_url_params = new URLSearchParams(token_params);
            //@ts-ignore
            token_url.search = token_url_params;
            const token_res = await fetch(token_url, {
                method: "POST",
                headers: {
                    "Accept-language": "en\r\n",
                    "Content-type": "application/x-www-form-urlencoded\r\n",
                    "Content-Length": `${token_url_params.toString().length}\r\n`,
                },
                body: token_url_params.toString(),
            });
            const result = await token_res.text();
            if (result.match(/is_valid\s*:\s*true/i)) {
                let matches = req.query["openid.claimed_id"].match(
                    /^https:\/\/steamcommunity.com\/openid\/id\/([0-9]{17,25})/
                );
                const steamid = matches[1].match(/^-?\d+$/) ? matches[1] : 0;
                const tokenset = new TokenSet({
                    id_token: uuidv4(),
                    access_token: uuidv4(),
                    steamid: steamid,
                });
                return { tokens: tokenset };
            } else {
                return { tokens: new TokenSet({}) };
            }
        },
    },
    userinfo: {
        async request(ctx) {
            const user_result = await fetch(
                `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${ctx.provider.clientSecret}&steamids=${ctx.tokens.steamid}`
            );
            const json = await user_result.json();
            return json.response.players[0];
        },
    },
    idToken: false,
    checks: ["none"],
    profile(profile: any) {
        return {
            id: profile.steamid,
            image: profile.avatarfull,
            name: profile.personaname,
        };
    },
    options,
    }
}