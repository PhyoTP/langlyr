import { useEffect, useState } from "react";
import { FiMinusCircle } from "react-icons/fi";
import { convertTime } from "./Play";
import { Link } from "react-router-dom";
const japaneseRegex = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
export const formatTranslations = (rawTranslation) => {
    let parsedTranslation = JSON.parse(rawTranslation)
    if (Object.prototype.toString.call(parsedTranslation) === '[object Object]') {
        Object.keys(parsedTranslation).forEach(w => {
            if (parsedTranslation[w].hiragana && parsedTranslation[w].meaning && parsedTranslation[w].sentences) {
                parsedTranslation[w] = {
                    [parsedTranslation[w].meaning]: {
                        hiragana: parsedTranslation[w].hiragana,
                        sentences: parsedTranslation[w].sentences.map(s => {
                            const { times, ...S } = s;
                            return {
                                ...S,
                                time: s.times && s.times[0]
                            }
                        })
                    }
                }
            }
        })
        return parsedTranslation
    }
    throw new Error("Translations are not formatted correctly!")
}
const Translations = () => {
    const [translations, setTranslations] = useState([]);
    const [query, setQuery] = useState("");
    const [importedTranslations, setITranslations] = useState("");
    useEffect(() => {
        const localTranslation = localStorage.getItem("translations");
        if (!localTranslation) return;

        try{
            const parsedTranslation = formatTranslations(localTranslation)
            setTranslations(parsedTranslation)
            localStorage.setItem("translations", JSON.stringify(parsedTranslation))
        }catch (e){
            console.error("Failed to parse translations: ", error);
        }
    }, [])
    function searchQuery(e){
        setQuery(e.target.value);
    }
    const removeTranslation = (word, translation) => {
        setTranslations(prev => {
            const { [word]: tempWord, ...tempTranslations } = prev;
            const {[translation]: _, ...newWord} = tempWord;
            const newTranslations = {[word]: newWord, ...tempTranslations};
            localStorage.setItem("translations", JSON.stringify(newTranslations))
            return newTranslations;
        });
    }
    return (
        <main>
            <div className="intro">
                <h1>Translations</h1>
            </div>
            <div className="vocabularyTable main">
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
                            const full = [t,Object.keys(translations[t]), Object.values(translations[t]).map(h=>h.hiragana)].join("-")
                            return full.includes(query)
                        }).map(word => {
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
                                
                                <td className="expand-cell">{Object.keys(translations[word]).map((t,i)=>{
                                    return <><div className="sentence-container">{translations[word][t].sentences.map(sent => {

                                        return <Link className="sentence" title={sent.song} to={`/play/video/${sent.youtube_id}?time=${sent.time && convertTime(sent.time)}`}>{sent.sentence}</Link>

                                    })}</div>
                                    {i != Object.keys(translations[word]).length - 1 && <hr />}
                                    </>
                                })}</td>
                                <td> {Object.keys(translations[word]).map((t,i)=>{
                                    return <><button
                                        onClick={() => {
                                            removeTranslation(word,t)
                                        }}
                                        className="delete-button"
                                    >
                                        <FiMinusCircle size="1.5rem" />
                                    </button>{i != Object.keys(translations[word]).length - 1 && <hr />}</>
                                })}</td>
                            </tr>
                        }) : <p>No translations, listen to some songs!</p>}
                    </tbody>

                </table>
            </div>
            <form className="main" onSubmit={e=>{
                e.preventDefault();
                try{
                    const parsedTranslation = formatTranslations(importedTranslations)
                    setTranslations(() => {return {...translations, ...parsedTranslation}})
                    localStorage.setItem("translations", JSON.stringify({...translations, ...parsedTranslation}))
                    setITranslations("")
                }catch (e){
                    console.error("Failed to parse translations: ", error);
                }
            }}>
                <p>Import translations</p>
                <textarea value={importedTranslations} onChange={e=>setITranslations(e.target.value)}/>
                <input type="submit" value="Import"/>
            </form>
        </main>
    )
}
export default Translations;