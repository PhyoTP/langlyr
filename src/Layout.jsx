import Start from "./Start";
import Play from "./Play"
import { BrowserRouter, Route, Routes, Link } from "react-router-dom";
import Translations from "./Translations";
const Layout = () =>{
    return (
        <BrowserRouter>
            <header>
                <Link to="/"><img src="/langlyrlogo.svg" /></Link>
                <Link to="/translations">My translations</Link>
            </header>
            <Routes>
                <Route path="/" element={<Start />} />
                <Route path="/play/:type/:id" element={<Play />} />
                <Route path="/translations" element={<Translations />} />
            </Routes>
        </BrowserRouter>
    )
}
export default Layout;