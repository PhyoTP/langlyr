import { useParams } from "react-router-dom"
import { useEffect, useRef, useMemo, useState } from "react";
import "./Play.css"
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
        if (ready){
        if (!strictLyricData) return null;
        if (strictLyricData.length == 0 && !lyricData) return null;
        const data = strictLyricData.length == 0 ? lyricData : strictLyricData;
        const synced = data.find(l => l.syncedLyrics)
        if (!synced) return null;
        const lines = synced.syncedLyrics.split("\n");
        const times = lines.map(line => line.split("]")[0].slice(1));
        const verses = lines.map(line => line.split("]")[1]?.trim());
        console.log(times)
        return [times, verses];
        }else {
            return null;
        }
    },[strictLyricData, lyricData, ready])
    const [currentLyricI, setCurrentLyricI] = useState(0);
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
            }
            
        }, 100);

        return () => clearInterval(interval);
    }, [lyrics, currentLyricI]);
    useEffect(()=>{
        const element = lyricRefs.current[currentLyricI]; 
        if (element){ 
            element.scrollIntoView({ behavior: "smooth", block: "end", }); 
        }
    },[currentLyricI])
    return (
        <div className="main">
            <div id="yt-player" />
            {ready &&
                <div className="lyrics">
                    <div className="vSpacer" />
                    {strictLyricLoading && <h1>Loading...</h1>}
                    {lyricLoading && <h1>Still loading...</h1>}
                    {lyrics && lyrics[1].slice(0, currentLyricI + 1).map((lyric, i)=>{
                        return (<div
                        key={i}
                        ref={el => lyricRefs.current[i] = el}
                        className={`${i === currentLyricI ? "activeLyric " : ""}lyric`}
                        >
                            <p className="lyricTime">{lyrics[0][i]}</p> {lyric}
                        </div>)
                    })}
                </div>
                
            }
        </div>
        
    )
}
export default Play;