import "./Start.css"
import { useState } from "react"
import { useNavigate } from "react-router-dom";
const Start = () => {
    const [id, setId] = useState("");
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const submitId = (e) =>{
        e.preventDefault();
        const videoRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const videoMatch = id.match(videoRegExp);

        if (videoMatch && videoMatch[2].length === 11) {
            navigate("/play/video/"+videoMatch[2])
        }else{
            const listRegExp = /[?&]list=([^#\&\?]+)/;
            const listMatch = id.match(listRegExp);

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
    return (
        <form className="main" onSubmit={submitId}>
            <input type="text" placeholder="Enter a YouTube video or playlist" className="mainField" value={id} onChange={changeId}/>
            <input type="submit" className="mainSubmit"/>
            {error &&(
                <p className="error">Error: {error}</p>
            )}
        </form>
    )
}
export default Start;