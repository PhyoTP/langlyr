import "./Start.css"
import { useState } from "react"
import { useNavigate } from "react-router-dom";
const Start = () => {
    const [id, setId] = useState("");
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const submitId = (e, autoid) =>{
        const ID = autoid || id;
        e.preventDefault();
        const videoRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const videoMatch = ID.match(videoRegExp);

        if (videoMatch && videoMatch[2].length === 11) {
            navigate("/play/video/"+videoMatch[2])
        }else{
            const listRegExp = /[?&]list=([^#\&\?]+)/;
            const listMatch = ID.match(listRegExp);

            if (listMatch) {
                navigate("/play/playlist/"+listMatch[1])
            }else{
                setError("ID not found, make sure it is a real YouTube video or playlist!")
            }
        }
    
    }
    const changeId = (e) =>{
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
        }
    ]
    return (
        <main>
            <div className="intro">
                <h1 className="title">LangLyr</h1>
                <p>A Japanese lyric vocabulary learning app</p>
            </div>
            <form className="main" onSubmit={submitId}>
                <input type="text" placeholder="Enter a YouTube video or playlist URL" className="mainField" value={id} onChange={changeId}/>
                <input type="submit" className="mainSubmit" value="Start learning"/>
                {error &&(
                    <p className="error">Error: {error}</p>
                )}
                <h2>Artists</h2>
                <div className="options">
                {artistList.map(a=>{
                    return <button onClick={e=>{
                        submitId(e, a.id)
                    }}><img src={a.image} /><p>{a.name}</p></button>
                })}
                </div>
            </form>
        </main>
    )
}
export default Start;