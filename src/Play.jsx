import { useParams } from "react-router-dom"
import { useEffect, useRef, useMemo, useState } from "react";
import "./Play.css"
import useSWR from "swr";
const fetcher = (...args) => fetch(...args).then((res) => res.json());
const Play = () => {
    const { type, id } = useParams();
    const playerRef = useRef(null);
    const lyricRefs = useRef([]);
    const [currentTitle, setCurrentTitle] = useState("");
    const [ready, setReady] = useState(false);
    const [currentLyricI, setCurrentLyricI] = useState(0);
    const [translations, setTranslations] = useState({});
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            document.body.appendChild(tag);
        } else if (window.YT && window.YT.Player) {
            createPlayer();
        }

        window.onYouTubeIframeAPIReady = createPlayer;

        function createPlayer() {
            playerRef.current = new window.YT.Player('yt-player', {
                ...(type == "video" && { videoId: id }),
                playerVars: {
                    ...(type == "playlist" && { listType: "playlist", list: id }),
                    autoplay: 1,
                    modestbranding: 1,
                    shuffle: 1,
                    loop: 1,
                    enablejsapi: 1
                },
                origin: window.location.origin,
                events: {
                    onReady: (event) => {
                        setReady(true);
                        // Shuffle playlist on ready
                        event.target.setShuffle(true);
                        event.target.nextVideo();
                        console.log(playerRef.current.getPlaylist());
                    },
                    onStateChange: (event) => {
                        // Update playing state based on YouTube player state
                        // setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
                        if (event.data === window.YT.PlayerState.PLAYING) {
                            const data = playerRef.current.getVideoData();
                            setCurrentTitle(data.title);
                        }
                    }
                }
            });
        }

        return () => {
            // Cleanup
            if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                playerRef.current.destroy();
            }
        };
    }, []);
    function cleanTitle(title) {
        return title
            .replace(/\(?official.*\)/i, "")
            .replace(/\(?lyric.*\)/i, "")
            .trim()
    }
    const artist = useMemo(() => {
        if (!playerRef.current?.getVideoData() || !ready) return;

        const videoData = playerRef.current.getVideoData();
        console.log(videoData);
        return videoData.author
            .replace(" - Topic", "")
            .replace("VEVO", "")
            .trim();
    }, [currentTitle, ready]);
    function artistRegex() {
        const pattern = artist.split("").join("\\s*");
        return new RegExp(pattern, "i");
    }
    const { data: strictLyricData, isLoading: strictLyricLoading } = useSWR(currentTitle !== "" ? `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist.trim())}&track_name=${encodeURIComponent(cleanTitle(currentTitle).replace(artistRegex(), "").trim())}` : null, fetcher)
    const { data: lyricData, isLoading: lyricLoading } = useSWR(strictLyricData && !strictLyricData.some(l => l.syncedLyrics) ? `https://lrclib.net/api/search?q=${encodeURIComponent(artist.trim())} ${encodeURIComponent(cleanTitle(currentTitle).replace(artistRegex(), "").trim())}` : null, fetcher);
    const lyrics = useMemo(() => {
        if (ready) {
            if (!strictLyricData) return null;
            if (strictLyricData.length == 0 && !lyricData) return null;
            const data = strictLyricData.length == 0 ? lyricData : strictLyricData;
            const synced = data.find(l => l.syncedLyrics)
            if (!synced) return null;
            const lines = synced.syncedLyrics.split("\n");
            const times = lines.map(line => line.split("]")[0].slice(1));
            const verses = lines.map(line => line.split("]")[1]?.trim());
            return [times, verses];
        } else {
            return null;
        }
    }, [strictLyricData, lyricData, ready])
    useEffect(() => {
        if (!lyrics) return;

        const interval = setInterval(() => {
            const currentTime = playerRef.current?.getCurrentTime?.();
            if (currentTime == null) return;

            const index = lyrics[0].findIndex(time => {
                const [m, s] = time.split(":").map(Number);
                return m * 60 + s > currentTime;
            }) - 1;

            if (index !== currentLyricI) {
                setCurrentLyricI(index);
                segment(lyrics[1][index])
            }

        }, 100);

        return () => clearInterval(interval);
    }, [lyrics, currentLyricI]);
    useEffect(() => {
        const element = lyricRefs.current[currentLyricI];
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "end", });
        }
    }, [currentLyricI])
    const segment = (str) => {
        const segmenterJa = new Intl.Segmenter("ja-JP", { granularity: "word" });
        const segments = segmenterJa.segment(str);
        return Array.from(segments);
    }
    const translate = async (e) => {
        console.log(e.target.textContent)
        const response = await fetch('https://api.langlyr.phyotp.dev/jisho?keyword=' + encodeURIComponent(e.target.textContent));
        const data = await response.json();
        const words = data?.data;
        if (words && words.length > 0) {
            setTranslations(prev => ({...prev, [e.target.textContent]: {"meaning":words[0].senses[0].english_definitions[0],"hiragana":words[0].japanese[0].reading}}))
        }
        e.target.style.textDecoration = "none"
    }
    return (
        <div className="main">
            <div id="yt-player" />
            {ready &&
                <div className="lyrics">
                    {strictLyricLoading && <h1>Loading...</h1>}
                    {lyricLoading && <h1>Still loading...</h1>}
                    {lyrics && lyrics[1].slice(0, currentLyricI + 1).map((lyric, i) => {
                        return (<div
                            key={i}
                            ref={el => lyricRefs.current[i] = el}
                            className={`${i === currentLyricI ? "activeLyric " : ""}lyric`}
                        >
                            <p className="lyricTime">{lyrics[0][i]}</p> {segment(lyric).filter(s => s.segment.trim().length !== 0).map((s) => {
                                return (
                                    <span className="segmentContainer">
                                        <p className="furigana">{translations[s.segment] ? translations[s.segment].hiragana : ""}</p>
                                        <p className="segment" onClick={translations[s.segment] ? undefined : translate}>{translations[s.segment] ? translations[s.segment].meaning : s.segment}</p>
                                    </span>
                                )
                            })}
                        </div>)
                    })}
                </div>

            }
        </div>

    )
}
export default Play;