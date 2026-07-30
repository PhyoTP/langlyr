import { useParams } from "react-router-dom";
import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import "./Play.css";
import useSWR from "swr";
import * as kuromoji from '@patdx/kuromoji'
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

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
    const lyricsContainer = useRef(null);
    const [currentTitle, setCurrentTitle] = useState("");
    const [ready, setReady] = useState(false);
    const [currentLyricI, setCurrentLyricI] = useState(0);
    const [translations, setTranslations] = useState({});
    const [lyricsI, setLyricsI] = useState(0);
    const [tokeniser, setTokeniser] = useState(null);
    const [lyricsCount, setLyricsC] = useState(0);
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
    const { data: lyricData, isLoading: lyricLoading } = useSWR(strictLyricData && strictLyricData.length == 0 ? `https://lrclib.net/api/search?q=${encodeURIComponent(artist.trim())} ${encodeURIComponent(cleanTitle(currentTitle).replace(artistRegex(), "").trim())}` : null, fetcher);
    const lyrics = useMemo(() => {
        if (ready) {
            if (!strictLyricData) return null;
            if (strictLyricData.length == 0 && !lyricData) return null;
            const data = strictLyricData.length == 0 ? lyricData : strictLyricData;
            const japaneseL = data.filter(l => japaneseRegex.test(l.plainLyrics))
            if (japaneseL.length === 0) return null;
            const syncedL = data.filter(l => l.syncedLyrics && japaneseRegex.test(l.plainLyrics))
            if (syncedL.length > 0){
                setLyricsC(syncedL.length);
                const chosen = syncedL[lyricsI%syncedL.length]
                const lines = chosen.syncedLyrics.split("\n").filter(l => l.length > 0 && /^\d$/.test(l[1]));
                console.table(lines)
                const times = lines.map(line => line.split("]")[0].slice(1));
                const verses = lines.map(line => line.split("]")[1]?.trim());
                return [times, verses];
            }else{
                setLyricsC(japaneseL.length)
                const chosen = japaneseL[lyricsI%japaneseL.length]
                const lines = chosen.plainLyrics.split("\n").filter(l => l.length > 0);
                console.table(lines)
                return [null, lines];

            }
        } else {
            return null;
        }
    }, [strictLyricData, lyricData, ready, lyricsI])
    useEffect(()=>{
        setLyricsI(0)
    },[currentTitle])
    const convertTime = (timestamp) => {
        const [m, s] = timestamp.split(":").map(Number);
        return m * 60 + s
    }
    useEffect(() => {
        if (!lyrics) return;
        if (lyrics[0]){
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
        }else{
            setCurrentLyricI(lyrics[1].length-1)
        }
    }, [lyrics, currentLyricI]);
    useEffect(() => {
        if (!lyricsContainer.current) return;
        if (lyricRefs.current.length > Math.max(currentLyricI, 1) && currentLyricI > 0) {
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        lyricsContainer.current.scrollTop = lyricsContainer.current.scrollHeight;
                    }
                },
                {
                    root: lyricsContainer.current,
                    threshold: 1 // last element fully visible
                }
            );
            observer.observe(lyricRefs.current[currentLyricI - 1]);
            return () => observer.disconnect();
        }
    }, [currentLyricI])
    const segment = useCallback((str) => {
        if (tokeniser) {
            const tokens = tokeniser.tokenize(str)
            return tokens.map(t => {
                return {
                    segment: t.surface_form,
                    base: t.basic_form,
                    pos: [
                        t.pos,
                        t.pos_detail_1,
                        t.pos_detail_2,
                        t.pos_detail_3
                    ].filter(x => x !== "*"),
                    pronunciation: t.pronunciation,
                    reading: t.reading
                }
            })
        } else {
            const segmenterJa = new Intl.Segmenter("ja-JP", { granularity: "word" });
            const segments = segmenterJa.segment(str);
            return Array.from(segments).map(s => {
                return { segment: s.segment, base: s.segment }
            });
        }
    }, [tokeniser])
    const translate = async (s) => {
        const word = s.base
        const response = await fetch('https://api.langlyr.phyotp.dev/jisho?keyword=' + encodeURIComponent(word));
        const data = await response.json();
        let words = data?.data;
        if (words && words.length > 0) {
            let chosenResults = []
            const kanjiRegex = /\p{Script=Han}/u; 
            function kataToHira(str) {
                return str.replace(/[\u30A1-\u30F6]/g, ch =>
                    String.fromCharCode(ch.charCodeAt(0) - 0x60)
                );
            }
            console.log(s)
            if (kanjiRegex.test(word)){
                chosenResults = words.sift(w=>w.japanese.some(j=>j.word===word))
            }else{
                chosenResults = words.sift(w=>w.japanese.some(j=>j.reading && j.reading===s.pronunciation || j.reading===kataToHira(s.reading) || j.reading===word))
            }
            const posMappings = [
                {"名詞": "Noun", "形容詞": "adjective", "接続詞": "Conjunction"},
                {"接尾": "Suffix"},
                {},
                {}
            ]

            const senses = chosenResults.flatMap((result, index) =>
                result.senses.map(sense => ({
                    index,
                    sense
                }))
            );

            const selected = senses.sift(({ sense }) => {
                for (let i = 3; i >= 0; i--) {
                    if (!s.pos[i]) continue;

                    const mapped = posMappings[i][s.pos[i]];
                    return mapped && sense.parts_of_speech.some(p => p.includes(mapped));
                }
            });

            
            setTranslations(prev => ({
                ...prev,
                
                [currentTitle]: {
                    ...(prev[currentTitle] ?? {}),
                    [word]: {
                        meaning: selected[0].sense.english_definitions[0],
                        hiragana: chosenResults[selected[0].index].japanese.sift(j=>j=>j.reading && j.reading===s.pronunciation || j.reading===kataToHira(s.reading) || j.reading===word)[0].reading,
                        sentences: [
                            lyrics[0] ? lyrics[0].filter((_, index) => segment(lyrics[1][index]).some(w=>w.base == s.base)) : null,
                            lyrics[1].filter(l => segment(l).some(w=>w.base == s.base))
                        ]
                    }
                }
            }));
        }
    }
    useEffect(() => {
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
    }, [ready])
    const changeLyricsI = (value) =>{
        setLyricsI(prev => {
            let newNum = prev + value;
            if (newNum < 1) newNum = lyricsCount - 1;
            if (newNum > lyricsCount) newNum = 0;
            return newNum;
        })
    }
    return (
        <div className="main">
            <div id="yt-player" />
            {ready &&
                <div className="lyrics" ref={lyricsContainer}>
                    {!tokeniser && <p style={{ position: "absolute" }}>Loading tokeniser...</p>}
                    {strictLyricLoading && <h1>Loading lyrics...</h1>}
                    {lyricLoading && <h1>Still loading lyrics...</h1>}
                    {lyrics ? lyrics[1].slice(0, currentLyricI + 1).map((lyric, i) => {
                        return (<div
                            key={i}
                            ref={el => lyricRefs.current[i] = el}
                            className={`${i === currentLyricI && lyrics[0] ? "activeLyric " : ""}lyric`}
                        >
                            {lyrics[0] &&
                                <button className="lyricTime" onClick={() => {
                                    playerRef.current?.seekTo(convertTime(lyrics[0][i]), true)
                                }}>{lyrics[0][i]}</button>
                            }
                            {segment(lyric).filter(s => s.segment.trim().length !== 0).map((s, i) => {
                                const grammar = [["助詞", "助動詞", "記号", "フィラー"], ["非自立"]]
                                const noTransl = translations[currentTitle]?.[s.base] || !japaneseRegex.test(s.segment) || (s.pos[0] && grammar[0].includes(s.pos[0])) || (s.pos[1] && grammar[1].includes(s.pos[1]))
                                return (
                                    <span className="segmentContainer" key={i}>
                                        <p className="furigana">{translations[currentTitle]?.[s.base] ? translations[currentTitle][s.base].hiragana : /*s.pos[0] ||*/ ""}</p>
                                        <p
                                            className={`segment${noTransl ? "" : " japanese"}`}
                                            onClick={noTransl ? undefined : () => translate(s)}
                                            title={s.base}
                                        >
                                            {translations[currentTitle]?.[s.base] ? translations[currentTitle][s.base].meaning : s.segment}
                                        </p>
                                        <p className="kanji">{translations[currentTitle]?.[s.base] && (translations[currentTitle][s.base].hiragana != s.segment) ? s.segment : ""}</p>
                                    </span>
                                )
                            })}
                        </div>)
                    }) : !lyrics && !lyricLoading && !strictLyricLoading && <h1>Japanese lyrics not found.</h1>}
                    {lrcLibError && <h1>LRCLib error: {lrcLibError.message}</h1>}
                </div>
            }
            {lyricsCount > 0 && 
                <caption><button className="chevron-button" onClick={() => changeLyricsI(-1)}><FiChevronLeft /></button>Lyrics #{lyricsI+1}<button className="chevron-button" onClick={() => changeLyricsI(1)}><FiChevronRight /></button></caption>
            }
            <div className="vocabularyTable">
                <h1>Vocabulary</h1>
                <table>
                    {translations[currentTitle] && Object.keys(translations[currentTitle]).length > 0 &&<>
                        <thead>
                            <h1>{currentTitle}</h1>
                            <tr>
                                <th>Word</th>
                                <th>Hiragana</th>
                                <th>Meaning</th>
                                <th>Sentences</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(translations[currentTitle]).map(k => {
                                return <tr key={k}>
                                    <td><a href={`https://jisho.org/search/${k}`}>{k}</a></td>
                                    <td>{translations[currentTitle][k].hiragana}</td>
                                    <td>{translations[currentTitle][k].meaning}</td>
                                    <td>{translations[currentTitle][k].sentences[0] ? translations[currentTitle][k].sentences[0].map(t => 
                                        <button onClick={() =>
                                            playerRef.current?.seekTo(convertTime(t), true)
                                        }>{t}</button>
                                    ): translations[currentTitle][k].sentences[1].map(s => <p>{s}</p>)}</td>
                                    <button
                                        onClick={() => {
                                            setTranslations(prev => {
                                                const { [k]: _, ...newSongTranslations } = prev[currentTitle];
                                                return {
                                                    ...prev,
                                                    [currentTitle]: newSongTranslations,
                                                };
                                            });
                                        }}
                                    >
                                        Delete
                                    </button>
                                </tr>
                            })}
                        </tbody>
                    </>}
                    {Object.keys(translations).filter(t=>t!=currentTitle && Object.keys(translations[t]).length > 0).map(song => {
                        return <>
                            <thead>
                                <h1>{song}</h1>
                                <tr>
                                    <th>Word</th>
                                    <th>Hiragana</th>
                                    <th>Meaning</th>
                                    <th>Sentences</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(translations[song]).map(k => {
                                    return <tr key={k}>
                                        <td><a href={`https://jisho.org/search/${k}`}>{k}</a></td>
                                        <td>{translations[song][k].hiragana}</td>
                                        <td>{translations[song][k].meaning}</td>
                                        <td>{translations[song][k].sentences[1].map(s => 
                                            <p>{s}</p>
                                        )}</td>
                                        <button
                                            onClick={() => {
                                                setTranslations(prev => {
                                                    const { [k]: _, ...newSongTranslations } = prev[song];
                                                    return {
                                                        ...prev,
                                                        [song]: newSongTranslations,
                                                    };
                                                });
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </tr>
                                })}
                            </tbody>
                        </>
                    })}
                </table>
            </div>
        </div>

    )
}
export default Play;
Array.prototype.sift = function (callbackFn) {
    const filtered = this.filter(callbackFn)
    if (filtered.length == 0) return this
    return filtered
}