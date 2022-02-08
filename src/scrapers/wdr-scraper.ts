import { scrapeHTML } from "scrape-it";
import axios from "axios";
import qs from "qs";
import {Playlist, Stats} from "./scraper";

export enum Type {
    WDR1Live,
    WDR2,
    WDR3,
    WDR4,
    WDR5,
    WDRCosmo
}

export async function getCurrentStats(type: Type): Promise<Stats> {
    if (type === Type.WDR1Live) {
        const response = await axios.get("https://www1.wdr.de/radio/player/einslive-epg100~radioplayerjetztimprogramm.html");
        let tomorrow = false;
        let lastHour = 0;
        const result = scrapeHTML(response.data, {
            entries: {
                listItem: "body > div > div > table > tbody > tr > td",
                data: {
                    info: {
                        selector: "span.wdrrEpgSendung",
                        attr: "data-extension",
                        convert(raw: string) {
                            const data = JSON.parse(raw);
                            const start = data.sendungsstartTime.split('.');
                            const end = data.sendungsStopTime.split('.');
                            let startHour = parseInt(start[0]);
                            let endHour = parseInt(end[0]);
                            if (startHour < lastHour) {
                                tomorrow = true;
                            }
                            lastHour = startHour;
                            const startDate = new Date();
                            startDate.setHours(startHour + 1);
                            startDate.setMinutes(parseInt(start[1]));
                            startDate.setSeconds(0);
                            startDate.setMilliseconds(0);

                            const endDate = new Date();
                            endDate.setHours(endHour + 1);
                            endDate.setMinutes(parseInt(end[1]));
                            endDate.setSeconds(0);
                            endDate.setMilliseconds(0);

                            if (tomorrow) {
                                startDate.setDate(startDate.getDate() + 1);
                            }

                            if (tomorrow || endHour < startHour) {
                                endDate.setDate(endDate.getDate() + 1);
                            }

                            return {
                                moderator: data.sendungsInfoURLName,
                                start: startDate,
                                end: endDate,
                            };
                        }
                    },
                    title: {
                        selector: "span.wdrrEpgSendung strong a",
                    },
                }
            }
        }) as any;
        console.log(result.entries.map((entry: any) => ({
            moderator: entry.info.moderator,
            title: entry.title,
            start: entry.info.start,
            end: entry.info.end,
        })));
        // return null;
    }

    const url = [
        "https://www1.wdr.de/radio/wdr3/"
    ][type];

    const response = await axios.get(url);
    return scrapeHTML(response.data, {
        moderator: "#content > div > div:nth-child(3) > div > div > div > div.moduleBottom.clearfix > div.moduleFooter > span > au",
        broadcastTitle: "#content > div > div:nth-child(3) > div > div > div > div.moduleBottom.clearfix > div.showInfo > a"
    });
}



export async function getPlaylist(type: Type, hour: Date): Promise<Playlist> {
    const url = [
        "https://www1.wdr.de/radio/1live/musik/playlist/index.jsp",
        "https://www1.wdr.de/radio/wdr2/musik/playlist/index.jsp",
        "https://www1.wdr.de/radio/wdr3/titelsuche-wdrdrei-104.jsp",
        "https://www1.wdr.de/radio/wdr4/titelsuche-wdrvier-102.jsp",
        "https://www1.wdr.de/radio/wdr5/musik/titelsuche-wdrfuenf-104.jsp",
        "https://www1.wdr.de/radio/cosmo/musik/playlist/index.jsp"
    ][type];

    hour.setMinutes(30); // FIXME: mutation of parameter

    const payload = {
        playlistSearch_date: hour.getFullYear() + "-" + (hour.getMonth() + 1 + "").padStart(2, '0') + "-" + hour.getDate().toString().padStart(2, '0'),
        playlistSearch_hours: hour.getHours().toString().padStart(2, '0'),
        playlistSearch_minutes: hour.getMinutes().toString().padStart(2, '0'),
        submit: "suchen"
    };

    const response = await axios(url, {
        "headers": {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "accept-language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
            "cache-control": "max-age=0",
            "content-type": "application/x-www-form-urlencoded",
            "sec-ch-ua": "\" Not;A Brand\";v=\"99\", \"Google Chrome\";v=\"97\", \"Chromium\";v=\"97\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            "Referer": url,
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "data": qs.stringify(payload),
        "method": "POST"
    });

    const result = scrapeHTML(response.data, {
        tracks: {
            listItem: "#searchPlaylistResult > div > table > tbody > tr.data",
            data: {
                time: {
                    selector: ".entry.datetime",
                    convert(raw: string) {
                        const regex = /\s*(\d+)\.(\d+)\.(\d+),\s*(\d+)\.(\d+).*/s;
                        const match = regex.exec(raw);
                        if (match) {
                            const [, day, month, year, hour, minute] = match;
                            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour) + 1, parseInt(minute)); // UTC+1
                        }
                        return null;
                    },
                },
                title: {
                    selector: ".entry.title",
                }
            }
        }
    });

    return result as Playlist;
}
