import "./Start.css"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom";
import {FiCheck, FiCopy} from "react-icons/fi";
const Start = () => {
    const [id, setId] = useState("");
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const [lyricsC, setLyricsC] = useState(null);
    const [clicked, setClicked] = useState([]);
    useEffect(() => {
        if (!lyricsC) return;
        lyricsC.scrollTop = lyricsC.scrollHeight;
    }, [lyricsC])
    const submitId = (e, autoid) => {
        const ID = autoid || id;
        e.preventDefault();
        const videoRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const videoMatch = ID.match(videoRegExp);

        if (videoMatch && videoMatch[2].length === 11) {
            navigate("/play/video/" + videoMatch[2])
        } else {
            const listRegExp = /[?&]list=([^#\&\?]+)/;
            const listMatch = ID.match(listRegExp);

            if (listMatch) {
                navigate("/play/playlist/" + listMatch[1])
            } else {
                setError("ID not found, make sure it is a real YouTube video or playlist!")
            }
        }

    }
    const changeId = (e) => {
        setId(e.target.value);
    }
    const artistList = [
        {
            name: "YOASOBI",
            id: "https://music.youtube.com/playlist?list=PLenwGe8sd7p0",
            image: "https://images.genius.com/f437c48fd1fe61156ce503b774e562b4.1000x1000x1.png"
        },
        {
            name: "ILLIT",
            id: "https://music.youtube.com/playlist?list=PLesoYPDdcXF8",
            image: "https://images.genius.com/4263b3de9770e65937257775ba88cded.1000x1000x1.jpg"
        },
        {
            name: "Ado",
            id: "https://music.youtube.com/playlist?list=OLAK5uy_kaq7YKHY01MiwJ_sWEQOuEHoku01EpVAM",
            image: "https://images.genius.com/67404372734e028ac943a92cd5ccdee4.1000x1000x1.png"
        },
        {
            name: "Yuuri",
            id: "https://music.youtube.com/playlist?list=OLAK5uy_kaHswT6Xe3pd1QVjTg9sFGlQXHP97TT7U",
            image: "https://images.genius.com/934e3b9781ef7322ca74a09ce4cfcc9e.1000x1000x1.png"
        },
        {
            name: "YENA",
            id: "https://music.youtube.com/playlist?list=PLO8VRgVh0Buc",
            image: "https://images.genius.com/c71e9a276b1f7999c13fdf71c7b21936.1000x1000x1.png"
        },
        {
            name: "Miki Matsubara",
            id: "https://music.youtube.com/playlist?list=OLAK5uy_k-LDChYmgCGbGiCgNBYMser70buv-W_yo",
            image: "https://images.genius.com/bf314e7661c143fb4d15749842ff157f.980x980x1.png"
        },
        {
            name: "CARAMEL CANDiD",
            id: "https://music.youtube.com/playlist?list=OLAK5uy_l1GW7RN0mnY72dpJX_CFAS-fTcBudmC90",
            image: "https://images.genius.com/6c1249ec443a750d63fd44590417233b.755x755x1.jpg"
        },
        {
            name: "TWICE",
            id: "https://music.youtube.com/playlist?list=OLAK5uy_nsOMCQJ4nEL6y0L4cuXp28KeMT6iNmFmY",
            image: "https://images.genius.com/309da76e403666d515ce0b6675b0e674.1000x1000x1.png"
        },
        {
            name: "AKB48",
            id: "https://music.youtube.com/playlist?list=OLAK5uy_mD945kVxrze0akycwVSdxGfvrLucyOKmg",
            image: "https://images.genius.com/44c505fe75621c6048f8646f994264c0.1000x1000x1.jpg"
        },
        {
            name: "Utada Hikaru",
            id: "https://music.youtube.com/playlist?list=OLAK5uy_lsKZ08jS7vP5yYfkUWyUkxkdi1NRiOh2E",
            image: "https://images.genius.com/be847a0a967c54685101ae1498ae3ef4.1000x1000x1.png"
        }
    ]
    const playList = [
        {
            name: "Japan Hits",
            id: "https://music.youtube.com/playlist?list=RDCLAK5uy_kDTLUEleq2B4vQB6JB5P1DApC4nRayHUs",
            image: "https://yt3.googleusercontent.com/vxnc7YxAduPSWAkJKID23Hbm6624TcAhVP6kKY5KUaXdgUuzWoCQwjKKcA-okpyOedwrDr9i5y5zsg=w544-h544-l90-rj"
        },
        {
            name: "J-pop Radio",
            id: "https://music.youtube.com/playlist?list=RDATgx",
            image: "https://music.youtube.com/image/radioart?r=CjkKCi9tLzBnZDdmcnQKDS9nLzExZnFiZzF3bW4KDS9nLzExYjdfdmtjN3MKDS9nLzExajB2eWdiYnAQ6AcY6Ac"
        },
        {
            name: "Anime Hits",
            id: "https://music.youtube.com/playlist?list=RDCLAK5uy_nPxXg1gYFA4ZfQ0ke7N8ONHUPg5Ovr7AU",
            image: "https://yt3.googleusercontent.com/D0SgMSzShvTcdvJUciiIwaWH2cXZxdZUA67XPyFQr9WWw4bYdfSR0dz9ZARwYeLmFBn2Ya5pqbbjgA=w544-h544-l90-rj"
        }
    ]
    const exampleLyrics = [
        [
            {
                word: "Stay"
            },
            {
                word: "with"
            },
            {
                word: "me"
            },
        ],
        [
            {
                word: "真夜中",
                meaning: "dead of night",
                reading: "まよなか"
            },
            {
                word: "の"
            },
            {
                word: "ドア",
                meaning: "door"
            },
            {
                word: "を"
            },
            {
                word: "たたき",
                meaning: "to strike"
            },
        ],
        [
            {
                word: "帰ら",
                meaning: "to return",
                reading: "かえる"
            },
            {
                word: "ない"
            },
            {
                word: "で"
            },
            {
                word: "と"
            },
            {
                word: "泣い",
                meaning: "to cry",
                reading: "なく"
            },
            {
                word: "た"
            },
        ],
        [
            {
                word: "あの"
            },
            {
                word: "季節",
                meaning: "season",
                reading: "きせつ"
            },
            {
                word: "が"
            },
            {
                word: "今",
                meaning: "now",
                reading: "いま"
            },
            {
                word: "目",
                meaning: "sight",
                reading: "め"
            },
            {
                word: "の"
            },
            {
                word: "前",
                meaning: "in front (of)",
                reading: "まえ"
            },
        ],
        [
            {
                word: "Stay"
            },
            {
                word: "with"
            },
            {
                word: "me"
            },
        ]
    ]
    return (
        <main>
            <div className="intro">
                <div>
                    <h1 className="title">LangLyr</h1>
                    <p>A Japanese lyric vocabulary learning app</p>
                </div>
                <div className="lyrics" ref={setLyricsC}>
                    {exampleLyrics.map((l, i) => (
                        <div className={`lyric ${i == 3 && "activeLyric"}`}>
                            <button className="copy-lyric" onClick={e => {
                                const button = e.currentTarget;
                                navigator.clipboard.writeText(l.map(s=>s.word).join(""))
                                    .then(() => button.classList.add('copied'))
                            }}><FiCopy /><FiCheck /></button>
                            <div className="lyric-container">
                                {l.map(s => (
                                    <span className="segmentContainer">
                                        <p className="furigana">{clicked.includes(s.word) && s.meaning}</p>
                                        <p
                                            className={`segment${s.meaning && !clicked.includes(s.word) ? " japanese" : ""}`}
                                            onClick={s.meaning && !clicked.includes(s.word) ? e => {
                                                e.target.classList.add('loading-translation');
                                                setTimeout(() => {
                                                    setClicked(prev => [...prev, s.word])
                                                    e.target.classList.remove('loading-translation');
                                                }, 1000)
                                            } : undefined}
                                        >{s.word}</p>
                                        <p className="kanji">{clicked.includes(s.word) && s.reading}</p>
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <form className="main" onSubmit={submitId}>
                <input type="text" placeholder="Enter a YouTube video or playlist URL" className="mainField" value={id} onChange={changeId} />
                <input type="submit" className="mainSubmit" value="Learn" />
                {error && (
                    <p className="error">Error: {error}</p>
                )}
                <h2>Artists</h2>
                <div className="options">
                    {artistList.map(a => {
                        return <button onClick={e => {
                            submitId(e, a.id)
                        }}><img src={a.image} /><p>{a.name}</p></button>
                    })}
                </div>
                <h2>Lists</h2>
                <div className="options">
                    {playList.map(a => {
                        return <button onClick={e => {
                            submitId(e, a.id)
                        }}><img src={a.image} /><p>{a.name}</p></button>
                    })}
                </div>
            </form>
        </main>
    )
}
export default Start;