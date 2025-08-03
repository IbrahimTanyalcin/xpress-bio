
const {until_v2:until, log} = require("./helpers.js");
exports.promptOAuth2 = ({keys, tokens, families, visitedTokens, ws, availableModels}) => {
    const seen = new Set();
    ws.logIfDebug("Starting OAuth2 for G-nome");
    for (const k of keys) {
        switch(true) {
            case !seen.has("openai") && families?.["openai"]?.some(f => k.startsWith(f)):
                seen.add("openai");
                ws.logIfDebug("Found openai key - this is assumed to be bearer, ignoring");
                break;
            case !seen.has("gemini") && families?.["gemini"]?.some(f =>  k.startsWith(f)):
                seen.add("gemini");
                ws.logIfDebug("Found gemini key - this is assumed to be bearer, ignoring");
                break;
            case !seen.has("kong-api") && families?.["kong-api"]?.some(f => k.startsWith(f)):
                seen.add("kong-api");
                ws.logIfDebug("Found kong-api key");
                const tokenObj = tokens[k],
                    clientId = tokenObj["client_id"] ?? tokenObj["clientId"] ?? tokenObj["client-id"] ?? "client_id",
                    clientSecret = tokenObj["client_secret"] ?? tokenObj["clientSecret"] ?? tokenObj["client-secret"] ?? "client_secret",
                    grantType = tokenObj["grant_type"] ?? tokenObj["grantType"] ?? tokenObj["grant-type"] ?? "grant_type",
                    endpoint = tokenObj["endpoint"] 
                        ?? tokenObj["endPoint"] 
                        ?? tokenObj["end-point"] 
                        ?? tokenObj["end_point"] 
                        ?? tokenObj["uri"] 
                        ?? tokenObj["url"],
                    refreshEndpoint = tokenObj["refresh_endpoint"] 
                        ?? tokenObj["refreshEndpoint"] 
                        ?? tokenObj["refresh-endpoint"] 
                        ?? tokenObj["refresh_uri"]
                        ?? tokenObj["refresh-uri"]
                        ?? tokenObj["refreshUri"]
                        ?? tokenObj["refresh_url"]
                        ?? tokenObj["refresh-url"]
                        ?? tokenObj["refreshUrl"],
                    ttl = tokenObj["ttl"] 
                        ?? tokenObj["time-to-live"] 
                        ?? tokenObj["time_to_live"] 
                        ?? tokenObj["timeToLive"]
                        ?? 1800000,
                    params = new URLSearchParams();
                //ws.logIfDebug({clientId, clientSecret, grantType, endpoint, refreshEndpoint});
                if ([endpoint, refreshEndpoint].some(function(addr){
                    return this.includes(addr) || typeof addr !== "string"
                }, ["", null, void(0)])) {
                    throw new Error(`At least an "endpoint" AND "refresh_endpoint" keys are needed for Kong API`);
                }
                /** application/x-www-form-urlencoded does not expect what you think it does
                 * it does not expect: encodeURI(`key1=val1&key2=val2`)
                 * instead it wants: `${encodeURIComponent(key1)}=${encodeURIComponent(val1)}&...`
                 * so instead of above, using URLSearchParams make sense, turns out its been there for a long time.
                */
                params.append("client_id", clientId);
                params.append("client_secret", clientSecret);
                params.append("grant_type", grantType);
                const body = params.toString();
                until(async (iterations) => {
                    try {
                        const res = await fetch(
                            refreshEndpoint,
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/x-www-form-urlencoded"
                                },
                                body
                            }
                        );
                        const json = await res.json();
                        const token = json["access_token"]
                            ?? json["accessToken"]
                            ?? json["access-token"]
                            ?? json["access"]
                            ?? json["token"];
                        //ws.logIfDebug("token is", token);
                        if (!token) {
                            throw new Error("Access token for kong-api could not be obtained");
                        }
                        Object.values(availableModels).forEach(oModel => {
                            const modelName = oModel.name;
                            if(!oModel.name.startsWith("kong-api")){
                                //ws.logIfDebug("MODEL DOES NOT START WITH kong-api");
                                return
                            }
                            ws.logIfDebug("iterations", iterations);
                            if(!iterations.value) {
                                const v0 = void(0);
                                Object.assign(oModel.config, tokenObj,
                                    {
                                        value: v0, 
                                        "client_secret": v0, clientSecret: v0, "client-secret": v0,
                                        "client_id": v0, clientId: v0, "client-id": v0
                                    }
                                );
                            }
                            ws.logIfDebug(oModel);
                            if(!visitedTokens.has(modelName)) {
                                return visitedTokens.set(modelName, {value: token})
                            }
                            visitedTokens.get(modelName).value = token;
                        });
                        ++iterations.value;
                    } catch (err) {
                        log(
                            "Error while trying to get access token for kong-api",
                            err
                        );
                    }
                    /**below interval is not a number, it gets coerced to number during runtime
                     * why? because you can't initally wait 30 mins to get the token, it needs to
                     * be called first and then after ttl milliseconds. There are probably better
                     * ways. It is good enough for me. 
                     */
                }, {interval: {valueOf: function(){
                    if(!this.value){return this.value = 5000}
                    return this.value = ttl
                }}, args: [{value: 0}]});
                break;
            default:
                ws.logIfDebug("Found a key that does not belong to any token family:", k);
                break;
        }
    }
}