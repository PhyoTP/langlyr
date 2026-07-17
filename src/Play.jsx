import { useParams } from "react-router-dom";
import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import "./Play.css";
import useSWR from "swr";
import * as kuromoji from '@patdx/kuromoji'

const fetcher = async (url) => {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  return res.json();
};
const japaneseRegex = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
const Play = () => {
    const { type, id } = useParams();
    const playerRef = useRef(null);
    const lyricRefs = useRef([]);
    const lyricsCRef = useRef(null);
    const [currentTitle, setCurrentTitle] = useState("");
    const [ready, setReady] = useState(false);
    const [currentLyricI, setCurrentLyricI] = useState(0);
    const [translations, setTranslations] = useState({});
    const [lyricsI, setLyricsI] = useState(0);
    const [tokeniser, setTokeniser] = useState(null);
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
    const { data: strictLyricData, isLoading: strictLyricLoading, error: lrcLibError } = useSWR(currentTitle !== "" ? `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist.trim())}&track_name=${encodeURIComponent(cleanTitle(currentTitle).replace(artistRegex(), "").trim())}` : null, fetcher)
    const { data: lyricData, isLoading: lyricLoading } = useSWR(strictLyricData && !strictLyricData.some(l => l.syncedLyrics) ? `https://lrclib.net/api/search?q=${encodeURIComponent(artist.trim())} ${encodeURIComponent(cleanTitle(currentTitle).replace(artistRegex(), "").trim())}` : null, fetcher);
    const lyrics = useMemo(() => {
        if (ready) {
            if (!strictLyricData) return null;
            if (strictLyricData.length == 0 && !lyricData) return null;
            const data = strictLyricData.length == 0 ? lyricData : strictLyricData;
            const synced = data.filter(l => l.syncedLyrics && japaneseRegex.test(l.plainLyrics))[lyricsI]
            if (!synced) return null;
            const lines = synced.syncedLyrics.split("\n").filter(l => l.length > 0 && /^\d$/.test(l[1]));
            console.table(lines)
            const times = lines.map(line => line.split("]")[0].slice(1));
            const verses = lines.map(line => line.split("]")[1]?.trim());
            return [times, verses];
        } else {
            return null;
        }
    }, [strictLyricData, lyricData, ready])
    const convertTime = (timestamp) =>{
        const [m, s] = timestamp.split(":").map(Number);
        return m * 60 + s
    }
    useEffect(() => {
        if (!lyrics) return;

        const interval = setInterval(() => {
            const currentTime = playerRef.current?.getCurrentTime?.();
            if (currentTime == null) return;

            const index = lyrics[0].findIndex(ts => convertTime(ts) > currentTime) - 1;

            if (index !== currentLyricI) {
                setCurrentLyricI(index);
                segment(lyrics[1][index])
            }

        }, 100);

        return () => clearInterval(interval);
    }, [lyrics, currentLyricI]);
    useEffect(() => {
        if (!lyricsCRef) return;
        if (lyricRefs.current.length > 1) {
            const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                lyricsCRef.current.scrollTop = lyricsCRef.current.scrollHeight;
                }
            },
            {
                root: lyricsCRef.current,
                threshold: 1 // last element fully visible
            }
            );
            observer.observe(lyricRefs.current[currentLyricI-1]);
            return () => observer.disconnect();
        }
    }, [currentLyricI])
    const segment = useCallback((str) => {
        if (tokeniser){
            const tokens = tokeniser.tokenize(str)
            return tokens.map(t => {
                return {
                    segment: t.surface_form, 
                    base: t.basic_form, 
                    pos: t.pos, 
                    pos1: t.pos_detail_1 != "*" && t.pos_detail_1,
                    pos2: t.pos_detail_2 != "*" && t.pos_detail_2,
                    pos3: t.pos_detail_3 != "*" && t.pos_detail_3,
                }
            })
        }else{
            const segmenterJa = new Intl.Segmenter("ja-JP", { granularity: "word" });
            const segments = segmenterJa.segment(str);
            return Array.from(segments).map(s => {
                return {segment: s.segment, base: s.segment}
            });
        }
    }, [tokeniser])
    const translate = async (word) => {
        const response = await fetch('https://api.langlyr.phyotp.dev/jisho?keyword=' + encodeURIComponent(word));
        const data = await response.json();
        let words = data?.data;
        if (words && words.length > 0) {
            const chosenResults = (()=>{
                const wordVariations = words.flatMap((inner, index) =>
                    inner.japanese.map(element => ({
                        index,
                        element
                    }))
                );
                const matchingVariations = [...new Set(wordVariations.filter(v=>v.element==word).map(v=>v.index))]
                if (matchingVariations.length === 1){
                    return words[0]
                }
                if (matchingVariations.length > 1){
                    words.filter((_,i)=>matchingVariations.includes(i))
                }
            })()

            setTranslations(prev => ({...prev, [word]: {meaning:words[0].senses[0].english_definitions[0],hiragana: words[0].japanese[0].reading, song: currentTitle, sentences: [lyrics[0].filter((_,index) => lyrics[1][index].includes(word)), lyrics[1].filter((l) => l.includes(word))]}}))
        }
    }
    useEffect(()=>{
        if (!ready || tokeniser) return;
        const initTokeniser = async () => {
            const myLoader = {
                async loadArrayBuffer(url) {
                    url = url.replace('.gz', '')
                    const res = await fetch(
                        'https://cdn.jsdelivr.net/npm/@aiktb/kuromoji@1.0.2/dict/' + url, //if tokeniser stops working try downloading .dat.gz
                    )
                    if (!res.ok) {
                        throw new Error(`Failed to fetch ${url}, status: ${res.status}`)
                    }
                    return res.arrayBuffer()
                },
            }
            const tokenizer = await new kuromoji.TokenizerBuilder({
                loader: myLoader,
            }).build()
            setTokeniser(tokenizer)
        }
        initTokeniser()
    },[ready])
    return (
        <div className="main">
            <div id="yt-player" />
            {ready &&
                <div className="lyrics" ref={lyricsCRef}>
                    {!tokeniser && <p style={{position: "absolute"}}>Loading tokeniser...</p>}
                    {strictLyricLoading && <h1>Loading lyrics...</h1>}
                    {lyricLoading && <h1>Still loading lyrics...</h1>}
                    {lyrics ? lyrics[1].slice(0, currentLyricI + 1).map((lyric, i) => {
                        return (<div
                            key={i}
                            ref={el => lyricRefs.current[i] = el}
                            className={`${i === currentLyricI ? "activeLyric " : ""}lyric`}
                        >
                            <button className="lyricTime" onClick={()=>{playerRef.current?.seekTo(convertTime(lyrics[0][i]), true)}}>{lyrics[0][i]}</button> 
                            {segment(lyric).filter(s => s.segment.trim().length !== 0).map((s) => {
                                const grammar = [["助詞", "助動詞", "記号", "フィラー"],["非自立"]]
                                const noTransl = translations[s.base] || !japaneseRegex.test(s.segment) || (s.pos && grammar[0].includes(s.pos)) || (s.pos1 && grammar[1].includes(s.pos1))
                                return (
                                    <span className="segmentContainer">
                                        <p className="furigana">{translations[s.base] ? translations[s.base].hiragana : ""}</p>
                                        <p 
                                            className={`segment ${noTransl ? "" : "japanese"}`} 
                                            onClick={noTransl ? undefined : () => translate(s.base)} 
                                            title={s.base}
                                        >
                                            {translations[s.base] ? translations[s.base].meaning : s.segment}
                                        </p>
                                    </span>
                                )
                            })}
                        </div>)
                    }): !strictLyricLoading && ! lyricLoading && lyricData && <h1>Japanese lyrics not found.</h1>}
                    {lrcLibError && <h1>LRCLib error: {lrcLibError.message}</h1>}
                </div>
            }
            <div className="vocabularyTable">
                <h1>Vocabulary</h1>
                <table>
                    <tr>
                        <th>Word</th>
                        <th>Hiragana</th>
                        <th>Meaning</th>
                        <th>Song</th>
                        <th>Sentence</th>
                    </tr>
                    {Object.keys(translations).map(k => {
                        return <tr key={k}>
                            <td>{k}</td>
                            <td>{translations[k].hiragana}</td>
                            <td>{translations[k].meaning}</td>
                            <td>{translations[k].song}</td>
                            <td>{translations[k].sentences[0].map(t=><button>{t}</button>)}</td>
                        </tr>
                    })}
                </table>
            </div>
        </div>

    )
}
export default Play;