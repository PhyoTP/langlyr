import { useParams } from "react-router-dom"
import { useEffect, useRef, useMemo, useState } from "react";
import useSWR from "swr";
const fetcher = (...args) => fetch(...args).then((res) => res.json());
const Play = () =>{
    const {type, id} = useParams();
    const playerRef = useRef(null);
    const [currentTitle, setCurrentTitle] = useState("");
    const [ready, setReady] = useState(false);
    const lyricRefs = useRef([]);
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
                ...(type == "video" && {videoId: id}),
                playerVars: {
                    ...(type == "playlist" && {listType: "playlist", list: id}),
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
    const artist = useMemo(()=>{
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
    const {data: strictLyricData, isLoading: strictLyricLoading} = useSWR(currentTitle !== "" ? `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist.trim())}&track_name=${encodeURIComponent(cleanTitle(currentTitle).replace(artistRegex(), "").trim())}` : null, fetcher)
    const {data: lyricData, isLoading: lyricLoading} = useSWR(strictLyricData && !strictLyricData.some(l => l.syncedLyrics) ? `https://lrclib.net/api/search?q=${encodeURIComponent(artist.trim())} ${encodeURIComponent(cleanTitle(currentTitle).replace(artistRegex(), "").trim())}` : null, fetcher);
    const lyrics = useMemo(()=>{
        if (!strictLyricData) return null;
        if (!lyricData) console.log(strictLyricData)
        if (strictLyricData == [] && !lyricData) return null;
        if (lyricData) console.log(lyricData)
        const data = strictLyricData == [] ? lyricData : strictLyricData;
        const synced = data.find(l => l.syncedLyrics)
        if (!synced) return null;
        const lines = synced.syncedLyrics.split("\n");
        const times = lines.map(line => line.split("]")[0].slice(1));
        const verses = lines.map(line => line.split("]")[1].trim());
        return [times, verses];
    },[strictLyricData, lyricData])
    return (
        <div className="main">
            <div id="yt-player" />
            <div className="lyrics">
                {lyrics && lyrics.map((lyric, i) => (
                    <div
                    key={i}
                    ref={el => lyricRefs.current[i] = el}
                    className={i === currentLyricIndex ? "active" : ""}
                    >
                    {lyric.text}
                    </div>
                ))}
            </div>
        </div>
        
    )
}
export default Play;