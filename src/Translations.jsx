import { useEffect, useState } from "react";
import { FiMinusCircle } from "react-icons/fi";
import { convertTime } from "./Play";
import { Link } from "react-router-dom";
const Translations = () => {
    const [translations, setTranslations] = useState([]);
    const [query, setQuery] = useState("");
    useEffect(() => {
        const localTranslation = localStorage.getItem("translations");
        console.log(localTranslation)
        if (Object.prototype.toString.call(JSON.parse(localTranslation)) === '[object Object]') {
            setTranslations(JSON.parse(localTranslation))
        }
    }, [])
    function searchQuery(e){
        setQuery(e.target.value);
    }
    const removeTranslation = (word) => {
        setTranslations(prev => {
            const { [word]: _, ...newTranslations } = prev;
            localStorage.setItem("translations", JSON.stringify(newTranslations))
            return newTranslations;
        });
    }
    return (
        <div className="main">
            <h1>Translations</h1>
            <div className="vocabularyTable">
                <h2>Vocabulary</h2>
                <input type="text" className="mainField" placeholder="Search for a word..." value={query} onChange={searchQuery}></input>
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
                        {Object.keys(translations).length > 0 ? Object.keys(translations).filter(t=>{
                            if (query.length == 0) return true;
                            const full = [t,translations[t].hiragana, translations[t].meaning, ...translations[t].sentences.map(s=>s.sentence)].join("-")
                            return full.includes(query)
                        }).map(word => {
                            return <tr key={word}>
                                <td><a href={`https://jisho.org/search/${word}`}>{word}</a></td>
                                <td>{translations[word].hiragana}</td>
                                <td>{translations[word].meaning}</td>
                                <td className="expand-cell">
                                    {/* {translations[word].sentences.filter(s => s.song == currentTitle && s.times).map(sent => {

                                        return <button onClick={() =>
                                            sent.times && playerRef.current?.seekTo(convertTime(sent.times[0]), true)
                                        } className="sentence">{sent.sentence}</button>

                                    })} */}
                                    {translations[word].sentences.map(sent => {

                                        return <Link className="sentence" title={sent.song} to={`/play/video/${sent.youtube_id}?time=${sent.times && convertTime(sent.times[0])}`}>{sent.sentence}</Link>

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
                        }) : <p>No translations, listen to some songs!</p>}
                    </tbody>

                </table>
            </div>
        </div>
    )
}
export default Translations;