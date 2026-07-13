import Start from "./Start";
import Play from "./Play"
import { BrowserRouter, Route, Routes } from "react-router-dom";
const Layout = () =>{
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Start />} />
                <Route path="/play/:type/:id" element={<Play />} />
            </Routes>
        </BrowserRouter>
    )
}
export default Layout;