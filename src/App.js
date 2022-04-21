import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import Signin from "./signin/Signin";
import 'antd/dist/antd.css';
import Chat from "./chat/Chat";

export const AppContext = React.createContext();
const App = (props) => {
  return (
    <div className="App">
      <BrowserRouter>
        <Switch>
          <Route
            exact
            path="/"
            render={(props) => <Signin {...props} />}
          />
          <Route exact path="/chat" render={(props) => <Chat {...props} />} />
        </Switch>
      </BrowserRouter>
    </div>
  );
};

export default App;
