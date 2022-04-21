import React, { useCallback, useEffect, useState } from "react";
import Moment from 'moment';
import { message } from "antd";

import {
  findAllConversation,
  countNewMessages,
  findAllChatMessages,
  findChatMessageById,
  urlWebSocket,
} from "../util/ApiUtil";
import { useRecoilValue, useRecoilState } from "recoil";
import {
  loggedInUser,
  chatActiveContact,
  chatMessages,
} from "../atom/globalState";
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  Sidebar,
  Conversation,
  Avatar,
  ConversationHeader,
  AddUserButton,
  ArrowButton,
  MessageSeparator,
} from "@chatscope/chat-ui-kit-react";

var stompClient = null;
const Chat = (props) => {
  const currentUser = useRecoilValue(loggedInUser);
  const [text, setText] = useState("");
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useRecoilState(chatActiveContact);
  const [messages, setMessages] = useRecoilState(chatMessages);

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarStyle, setSidebarStyle] = useState({});
  const [chatContainerStyle, setChatContainerStyle] = useState({});
  const [conversationContentStyle, setConversationContentStyle] = useState({});
  const [conversationAvatarStyle, setConversationAvatarStyle] = useState({});

  const handleBackClick = () => setSidebarVisible(!sidebarVisible);

  useEffect(() => {
    if (sidebarVisible) {
      setSidebarStyle({
        display: "flex",
        flexBasis: "auto",
        width: "100%",
        maxWidth: "100%"
      });
      setConversationContentStyle({
        display: "flex"
      });
      setConversationAvatarStyle({
        marginRight: "1em"
      });
      setChatContainerStyle({
        display: "none"
      });
    } else {
      setSidebarStyle({});
      setConversationContentStyle({});
      setConversationAvatarStyle({});
      setChatContainerStyle({});
    }
  }, [sidebarVisible, setSidebarVisible, setConversationContentStyle, setConversationAvatarStyle, setSidebarStyle, setChatContainerStyle]);


  useEffect(() => {
    if (localStorage.getItem("accessToken") === null) {
      props.history.push("/");
    }
    connect();
    loadContacts();
    // eslint-disable-next-line
  }, []);
  useEffect(() => {
    if (activeContact === undefined) return;
    findAllChatMessages(activeContact.userId, currentUser.userId).then((msgs) => {
      setMessages(msgs.data)
    }
    );
    loadContacts();
    // eslint-disable-next-line
  }, [activeContact]);


  const connect = () => {
    const Stomp = require("stompjs");
    var SockJS = require("sockjs-client");
    SockJS = new SockJS(urlWebSocket(localStorage.getItem("accessToken")));
    stompClient = Stomp.over(SockJS);
    stompClient.connect({}, onConnected, onError);
  };

  const onConnected = () => {
    console.log("connected");
    stompClient.subscribe(
      "/user/" + currentUser.userId + "/queue/messages",
      onMessageReceived
    );
  };

  const onError = (err) => {
    console.log(err);
  };

  const onMessageReceived = (msg) => {
    const notification = JSON.parse(msg.body);
    const active = JSON.parse(sessionStorage.getItem("recoil-persist")).chatActiveContact;
    if (active.userId === notification.senderId) {
      findChatMessageById(notification.id).then((message) => {
        const newMessages = JSON.parse(sessionStorage.getItem("recoil-persist"))
          .chatMessages;
        newMessages.push(message.data);
        setMessages(newMessages);
      });
    } else {
      message.info("Received a new message from " + notification.senderName + " :  " + notification.content);
    }
    loadContacts();
  };

  const sendMessage = (msg) => {
    if (msg.trim() !== "") {
      const message = {
        senderId: currentUser.userId,
        recipientId: activeContact.userId,
        content: msg
      };
      stompClient.send("/app/chat", {}, JSON.stringify(message));

      const newMessages = [...messages];
      newMessages.push(message);
      setMessages(newMessages);
      loadContacts();
    }
  };

  const loadContacts = () => {
    const promise = findAllConversation().then((res) => {
      const users = res.data;
      return users.map((contact) => countNewMessages(contact.userId, currentUser.userId).then((count) => {
        contact.totalNewMessages = count.data;
        return contact;
      }))

    }
    )
    // .catch(function (error) {
    //   if (error && error.status === 401) {
    //     props.history.push("/");
    //     return Promise.reject("No access token set.");
    //   }
    // });

    promise.then((promises) => Promise.all(promises).then((users) => {
      setContacts(users);
      if (activeContact === undefined && users.length > 0) {
        setActiveContact(users[0]);
      }
    })
    );
  };

  const handleConversationClick = useCallback(() => {
    if (sidebarVisible) {
      setSidebarVisible(false);
    }
  }, [sidebarVisible, setSidebarVisible]);

  const logout = () => {
    localStorage.removeItem("accessToken");
    props.history.push("/");
  };

  return <div style={{
    height: "600px",
    position: "relative"
  }}>
    <MainContainer responsive>
      <Sidebar position="left" scrollable={true} style={sidebarStyle}>

        <ConversationHeader>
          <Avatar src={currentUser.photoPath} name={currentUser.firstName + currentUser.lastName} />
          <ConversationHeader.Content userName={currentUser.firstName + currentUser.lastName} info="Online" />
          <ConversationHeader.Actions>
            <AddUserButton />
            <ArrowButton direction="right" onClick={logout} />
          </ConversationHeader.Actions>
        </ConversationHeader>

        {contacts.map((contact, index) => (
          <Conversation key={index} onClick={() => { setActiveContact(contact); handleConversationClick() }} lastActivityTime={Moment(contact.receivedDate, Moment().ISO_8601).format("DD MMM YY, HH:mm")} active={activeContact && contact.userId === activeContact.userId ? true : false}>
            <Avatar src={contact.photoPath} name={contact.userName} status="available" style={conversationAvatarStyle} />
            <Conversation.Content name={contact.userName} info=
              {contact.totalNewMessages !== undefined && contact.totalNewMessages > 0 ?
                contact.totalNewMessages + " new messages "
                : contact.newMessage} style={conversationContentStyle} />

          </Conversation>
        ))}
      </Sidebar>
      <ChatContainer style={chatContainerStyle}>
        <ConversationHeader>
          <ConversationHeader.Back onClick={handleBackClick} />
          <Avatar src={activeContact && activeContact.photoPath} name={activeContact && activeContact.userName} />
          <ConversationHeader.Content userName={activeContact && activeContact.userName} info="Active 10 mins ago" />
        </ConversationHeader>
        <MessageList>
          <MessageSeparator content={Moment(new Date(), Moment().ISO_8601).format("dddd, DD MMMM YYYY")} />

          {messages.map((msg, index) => (
            <Message key={index} model={{
              message: msg.content,
              direction: msg.senderId === currentUser.userId ? "outgoing" : "incoming",
              position: "single"
            }}>
              {msg.senderId !== currentUser.userId && (
                <Avatar src={activeContact.photoPath} name={msg.senderId} />
              )}
            </Message>
          ))}

        </MessageList>
        <MessageInput
          value={text}
          onChange={(event) => (
            setText(event)
          )
          }
          onKeyPress={(event) => {
            if (event.key === "Enter") {
              sendMessage(text);
              setText("");
            }
          }}
          onClick={() => {
            sendMessage(text);
            setText("");
          }}
          placeholder="Type message here" attachButton={false} />
      </ChatContainer>
    </MainContainer>
  </div>;
}

export default Chat;
