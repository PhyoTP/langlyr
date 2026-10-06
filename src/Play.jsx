import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import "./Play.css";
import useSWR from "swr";
import * as kuromoji from '@patdx/kuromoji'
import { FiChevronLeft, FiChevronRight, FiMinusCircle, FiCopy, FiCheck } from "react-icons/fi";
import { formatTranslations } from "./Translations";
export const convertTime = (timestamp) => {
    const [m, s] = timestamp.split(":").map(Number);
    return m * 60 + s
}
const fetcher = async (url) => {
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
    }

    return res.json();
};
const japaneseRegex = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
const kanjiRegex = /\p{Script=Han}/u;
const baseURL = "http://api.langlyr.phyotp.dev/"
const Play = () => {
    const { type, id } = useParams();
    const [searchParams] = useSearchParams();
    const playerRef = useRef(null);
    const lyricRefs = useRef([]);
    const lyricsContainer = useRef(null);
    const [currentTitle, setCurrentTitle] = useState("");
    const [ready, setReady] = useState(false);
    const [currentLyricI, setCurrentLyricI] = useState(0);
    const [translations, setTranslations] = useState({});
    const [lyricsI, setLyricsI] = useState(0);
    const [tokeniser, setTokeniser] = useState(null);
    const [hoverWord, setHoverWord] = useState();
    const hasSeeked = useRef(false);
    useEffect(() => {
        const localTranslation = localStorage.getItem("translations");
        if (!localTranslation) return;

        try{
            const parsedTranslation = formatTranslations(localTranslation)
            setTranslations(parsedTranslation)
            
        }catch (e){
            console.error("Failed to parse translations: ", error);
        }
    }, [])
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
                    rel: 0,
                    shuffle: 1,
                    loop: 1,
                    enablejsapi: 1
                },
                origin: window.location.origin,
                events: {
                    onReady: (event) => {
                        setReady(true);
                        // Set initial volume when player is ready
                        event.target.setVolume(50);
                        // Shuffle playlist on ready
                        event.target.setShuffle(true);
                        event.target.nextVideo();
                        console.table(playerRef.current.getPlaylist());
                    },
                    onStateChange: (event) => {
                        // Update playing state based on YouTube player state
                        // setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
                        if (event.data === window.YT.PlayerState.PLAYING) {
                            const data = playerRef.current.getVideoData();
                            setCurrentTitle(data.title);
                            if (!hasSeeked.current) {
                                const time = searchParams.get("time");

                                if (time) {
                                    event.target.seekTo(Number(time), true);
                                    hasSeeked.current = true;
                                }
                            }
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
        const escaped = artist.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = escaped.split("").join("\\s*");
        return new RegExp(pattern, "i");
    }
    const { data: strictLyricData, isLoading: strictLyricLoading, error: lrcLibError } = useSWR(currentTitle !== "" ? `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist.trim())}&track_name=${encodeURIComponent(cleanTitle(currentTitle).replace(artistRegex(), "").trim())}` : null, fetcher)
    const { data: lyricData, isLoading: lyricLoading } = useSWR(strictLyricData && strictLyricData.length == 0 ? `https://lrclib.net/api/search?q=${encodeURIComponent(artist.trim())} ${encodeURIComponent(cleanTitle(currentTitle).replace(artistRegex(), "").trim())}` : null, fetcher);
    const candidates = useMemo(() => {
        if (!ready || !strictLyricData) return [];
        const data = strictLyricData.length === 0 ? lyricData : strictLyricData;
        if (!data) return [];
        const jp = data.filter(l => japaneseRegex.test(l.plainLyrics));
        const synced = jp.filter(l => l.syncedLyrics);
        return synced.length > 0 ? synced : jp;
    }, [strictLyricData, lyricData, ready]);

    const lyricsCount = candidates.length;
    const lyrics = useMemo(() => {
        if (candidates.length === 0) return null;
        const chosen = candidates[lyricsI % candidates.length];
        const plain = chosen.plainLyrics.split("\n");

        if (chosen.syncedLyrics) {
            const lines = chosen.syncedLyrics
            .split("\n")
            .filter(l => l.length > 0 && /^\d$/.test(l[1]));
            const times = lines.map(l => l.split("]")[0].slice(1));
            if (!japaneseRegex.test(chosen.syncedLyrics) && lines.length === plain.length) {
            return [times, plain];
            }
            return [times, lines.map(l => l.split("]")[1]?.trim())];
        }
        return [null, plain.filter(l => l.length > 0)];
    }, [candidates, lyricsI]);
    useEffect(() => {
        if (!lyrics) return;
        if (lyrics[0]) {
            const interval = setInterval(() => {
                const currentTime = playerRef.current?.getCurrentTime?.();
                if (currentTime == null) return;

                let index = lyrics[0].findIndex(ts => convertTime(ts) > currentTime) - 1;
                if (index < 0 && convertTime(lyrics[0][0]) < currentTime) {
                    index = lyrics[1].length - 1;
                }

                if (index !== currentLyricI) {
                    setCurrentLyricI(index);
                }

            }, 100);

            return () => clearInterval(interval);
        } else {
            setCurrentLyricI(lyrics[1].length - 1)
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
    const { data: allTokens } = useSWR(
        lyrics ? ["tokenise", lyrics[1]] : null,
        ([, texts]) =>
            fetch(baseURL + "tokenise", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texts }),
            }).then(r => r.json())
    );
    const formatTokens = (tokens) => {
        if (!tokens) return null;
        return tokens.map(t => {
            return {
                ...t,
                segment: t.surface,
                base: t.dictionary_form,
                pos: [...t.part_of_speech].filter(x => x !== "*")
            }
        })
    }
    const segment = useCallback((str) => {
        if (tokeniser) {
            const tokens = tokeniser.tokenize(str)
            return tokens.map(t => {
                return {
                    ...t,
                    segment: t.surface_form,
                    base: t.basic_form,
                    pos: [
                        t.pos,
                        t.pos_detail_1,
                        t.pos_detail_2,
                        t.pos_detail_3
                    ].filter(x => x !== "*")
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
    
    const addTranslation = (word, meaning, sentence, hiragana) => {
        setTranslations(prev => {
            const next = {
                ...prev,
                [word]: {
                    ...(prev[word] ?? {}),
                    ...(meaning && {[meaning]: {
                        ...(prev[word]?.[meaning] ?? { hiragana }),
                        sentences: [
                            ...(prev[word]?.[meaning]?.sentences ?? []),
                            sentence // sentence, time, song, id
                        ]
                    }})
                }
            };

            localStorage.setItem("translations", JSON.stringify(next));
            return next;
        });
    };
    const removeTranslation = (word) => {
        setTranslations(prev => {
            const { [word]: _, ...newTranslations } = prev;
            localStorage.setItem("translations", JSON.stringify(newTranslations))
            return newTranslations;
        });
    }
    function kataToHira(str) {
        if (!str) return "";
        return str.replace(/[\u30A1-\u30F6]/g, ch =>
            String.fromCharCode(ch.charCodeAt(0) - 0x60)
        );
    }
    function getTranslation(s) {
        const katakanaRegex = /\p{Script=Katakana}/u;
        if (katakanaRegex.test(s.segment)){
            if(translations[s.segment]){
                return translations[s.segment]
            }
        }
        if (translations[s.base]) {
            return translations[s.base]
        } else if (s.pos?.[0] == "動詞") {
            const potentials = { "え": "う", "け": "く", "げ": "ぐ", "せ": "す", "て": "つ", "ね": "ぬ", "べ": "ぶ", "め": "む", "れ": "る" }
            if (Object.keys(potentials).some(p => s.segment.endsWith(p) || s.segment.endsWith(p + "る"))) {
                let newBase = s.segment;
                if (s.segment.endsWith("る")) newBase = newBase.slice(0, -1)
                newBase = newBase.slice(0, -1) + potentials[newBase.at(-1)];
                return translations[newBase]
            }
        }

    }
    const translate = async (s, sentence) => {
        const word = s.base == "*" ? s.segment : s.base
        try {
            const response = await fetch(baseURL + 'translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    keyword: word,
                    sentence,
                    shortlist: getTranslation(s) && Object.keys(getTranslation(s))
                })
            });
            const { translation, hiragana } = await response.json()
            console.log(translation)
            addTranslation(word, translation, {sentence, time: lyrics[0]?.find((_, index) => lyrics[1][index] == sentence), song: currentTitle, youtube_id: playerRef.current.getVideoData().video_id}, hiragana || kataToHira(s.reading.length > 0 ? s.reading : s.segment))
            
        } catch {
            const response = await fetch(baseURL + 'jisho?keyword=' + encodeURIComponent(word));
            const data = await response.json();
            let words = data?.data;
            const potentials = { "え": "う", "け": "く", "げ": "ぐ", "せ": "す", "て": "つ", "ね": "ぬ", "べ": "ぶ", "め": "む", "れ": "る" }
            if (words && words.length > 0) {
                let chosenResults = []

                if (kanjiRegex.test(word)) {
                    chosenResults = words.sift(w => w.japanese.some(j => j.word === word))
                    chosenResults = words.sift(w => w.japanese.some(j => j.reading === s.pronunciation || j.reading === kataToHira(s.reading)))
                } else {
                    chosenResults = words.sift(w => w.japanese.some(j => j.reading === word))
                }

                console.log(chosenResults)
                const posMappings = [
                    { "名詞": "Noun", "形容詞": "adjective", "接続詞": "Conjunction", "接頭詞": "Prefix", "動詞": "(^|\\s)verb", "副詞": "Adverb ", "接頭詞": "Prefix" },
                    { "接尾": "Suffix", "代名詞": "Pronoun", "数": "Numeric", "副詞可能": "Adverb " },
                    { "副詞可能": "Adverb " },
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
                        if (!mapped) continue;
                        const mapRegex = new RegExp(mapped)
                        if (sense.parts_of_speech.some(p => mapRegex.test(p))) return true;

                    }
                    return false;
                });

                console.log(selected)

                addTranslation(
                    word, 
                    selected[0].sense.english_definitions[0], 
                    {}, 
                    chosenResults[selected[0].index].japanese.sift(j => j.reading === s.pronunciation || j.reading === kataToHira(s.reading) || j.reading === word)[0].reading
                )
            } else if (s.pos[0] == "動詞") {
                if (Object.keys(potentials).some(p => s.base.endsWith(p + "る"))) {
                    let newBase = s.base;
                    newBase = newBase.slice(0, -2) + potentials[newBase.at(-2)]
                    console.log(newBase)
                    await translate({ ...s, base: newBase }, sentence)
                }
            }


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
    const changeLyricsI = (value) => {
        setLyricsI(prev => {
            let newNum = prev + value;

            if (newNum < 0) newNum = lyricsCount - 1;
            if (newNum >= lyricsCount) newNum = 0;

            return newNum;
        });
    };
    return (
        <div className="main">
            <div id="yt-player" />
            {ready &&
                <div className="lyrics" ref={lyricsContainer}>
                    {!tokeniser && <p style={{ position: "absolute" }}>Loading tokeniser...</p>}
                    {strictLyricLoading && <h1>Loading lyrics...</h1>}
                    {lyricLoading && <h1>Still loading lyrics...</h1>}
                    {strictLyricLoading === false && lyricLoading === false && candidates.length == 0 && <h1>Lyrics not found.</h1>}
                    {lyrics && lyrics[1].slice(0, Math.min(currentLyricI + 2, lyrics[1].length)).map((lyric, i) => {
                        return (<div
                            key={i}
                            ref={el => lyricRefs.current[i] = el}
                            className={`${i === currentLyricI && lyrics[0] ? "activeLyric " : ""}lyric`}
                        >
                            <button className="copy-lyric" onClick={e => {
                                const button = e.currentTarget;
                                navigator.clipboard.writeText(lyrics[1][i])
                                    .then(() => button.classList.add('copied'))
                            }}><FiCopy /><FiCheck /></button>
                            {lyrics[0] &&
                                <button className="lyricTime" onClick={() => {
                                    playerRef.current?.seekTo(convertTime(lyrics[0][i]), true)
                                }}>{lyrics[0][i]}</button>
                            }
                            <div className="lyric-container">
                                {(formatTokens(allTokens?.[i]?.tokens) || segment(lyric)).filter(s => s.segment.trim().length !== 0).map((s, i) => {
                                    const grammar = [["感動詞", "記号", "フィラー", "助動詞"], ["間投", "非自立", "接尾","格助詞","準体助詞"]]
                                    // const posClasses = {
                                    //     vocab: ["形容詞"],
                                    //     grammar: [["接続詞"], ["非自立", "動詞非自立的", "接尾"]],
                                    //     other: [["助詞", "感動詞", "記号", "フィラー"], ["間投"]]
                                    // }
                                    const wordTranslations = getTranslation(s)
                                    const noTransl = !japaneseRegex.test(s.segment) || ((s.pos?.[0] && grammar[0].includes(s.pos[0])) || (s.pos?.[1] && grammar[1].includes(s.pos[1])) && !kanjiRegex.test(s.segment))
                                    const inSentence = Object.keys(wordTranslations || {}).find(meaning=>wordTranslations[meaning]?.sentences?.some(s=>s?.sentence == lyric))
                                    return (
                                        <span className="segmentContainer" key={i}>
                                            <p className="furigana">{wordTranslations ? inSentence || Object.keys(wordTranslations).at(0) : /*s.pos[1] ||*/ ""}</p>
                                            <p
                                                className={`segment${noTransl || inSentence ? "" : " japanese"}`}
                                                onClick={noTransl ? undefined : async (e) => {
                                                    addTranslation(s.base)
                                                    e.target.classList.add('loading-translation');
                                                    console.log(s)
                                                    await translate(s, lyric)
                                                    e.target.classList.remove('loading-translation');
                                                }}
                                                title={`${s.base} (${kataToHira(s.reading)})`}
                                            >
                                                {s.segment}
                                            </p>
                                            <p className="kanji">{wordTranslations && kanjiRegex.test(s.segment) && (wordTranslations[inSentence]?.hiragana || kataToHira(s.reading))}</p>
                                        </span>
                                    )
                                })}
                            </div>
                        </div>)
                    })}
                    {lrcLibError && <h1>LRCLib error: {lrcLibError.message}</h1>}
                </div>
            }
            {lyricsCount > 0 &&
                <div className="caption"><button className="chevron-button" onClick={() => changeLyricsI(-1)}><FiChevronLeft /></button>Lyrics #{lyricsI + 1}<button className="chevron-button" onClick={() => changeLyricsI(1)}><FiChevronRight /></button></div>
            }
            <div className="vocabularyTable">
                <h2>Vocabulary</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Word</th>
                            <th>Hiragana</th>
                            <th>Meaning</th>
                            <th>Sentences</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.keys(translations).filter(t => Object.values(translations[t]).some(t=>t.sentences.some(s => s?.song == currentTitle))).map(word => {
                            return <tr key={word}>
                                <td><a href={`https://jisho.org/search/${word}`}>{word}</a></td>
                                <td>{Object.keys(translations[word]).map((t,i)=>{
                                    return <>
                                    {translations[word][t].hiragana}
                                    {i != Object.keys(translations[word]).length - 1 && <hr />}
                                    </>
                                })}</td>
                                <td>{Object.keys(translations[word]).map((t,i)=>{
                                    return <>
                                    {t}
                                    {i != Object.keys(translations[word]).length - 1 && <hr />}
                                    </>
                                })}</td>
                                
                                <td className="expand-cell">
                                    {Object.keys(translations[word]).map((t,i)=>{
                                    return <>{translations[word][t].sentences.filter(s => s.song == currentTitle && s.time).map(sent => {

                                        return <button onClick={() =>
                                            sent.time && playerRef.current?.seekTo(convertTime(sent.time), true)
                                        } className="sentence">{sent.sentence}</button>

                                    })}
                                    {translations[word][t].sentences.filter(s => s.song != currentTitle || !s.time).map(sent => {

                                        return <span className="sentence" title={sent.song}>{sent.sentence}</span>

                                    })}

                                    {i != Object.keys(translations[word]).length - 1 && <hr />}
                                    </>
                                })}
                                </td>
                                <td>
                                    <button
                                        onClick={() => {
                                            removeTranslation(word)
                                        }}
                                        className="delete-button"
                                    >
                                        <FiMinusCircle size="1.5rem" />
                                    </button>
                                </td>
                            </tr>
                        })}
                    </tbody>
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