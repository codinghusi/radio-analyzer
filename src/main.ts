import * as WDR from './scrapers/wdr-scraper';

// const now = new Date();
// now.setHours(now.getHours() - 1);
//
// WDR.getPlaylist(WDR.Type.WDR1Live, now).then(playlist => {
//     console.log(playlist);
// });

WDR.getCurrentStats(WDR.Type.WDR1Live).then(stats => {
    console.log(stats);
});