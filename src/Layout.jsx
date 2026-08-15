import Start from "./Start";
import Play from "./Play"
import { BrowserRouter, Route, Routes, Link } from "react-router-dom";
const Layout = () =>{
    return (
        <BrowserRouter>
            <header>
                <Link to="/"><img src="/langlyrlogo.svg" /></Link>
            </header>
            <Routes>
                <Route path="/" element={<Start />} />
                <Route path="/play/:type/:id" element={<Play />} />
            </Routes>
        </BrowserRouter>
    )
}
export default Layout;