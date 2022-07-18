// ff450a7f531a4e9ab43bd2dd87cdbfcc

import styled from 'styled-components';
import languages from '../libs/languages';
import React, { useState, useCallback, useEffect } from 'react';
import { Table } from 'react-virtualized';
import unescape from 'lodash/unescape';
import debounce from 'lodash/debounce';
import { ReactTransliterate } from 'react-transliterate';
import { t, Translate } from 'react-i18nify';
// import englishKeywordsTranslate from '../libs/englishKeywordsTranslate';
import googleTranslate from '../libs/googleTranslate';
import { url2sub, vtt2url, sub2vtt } from '../libs/readSub';
import GetTranscriptLanguagesAPI from "../redux/actions/api/Transcript/GetTranscriptLanguages"
import APITransport from "../redux/actions/apitransport/apitransport"
import { useDispatch, useSelector } from 'react-redux';
import FetchTranscriptAPI from "../redux/actions/api/Transcript/FetchTranscript"
import GenerateTranscriptAPI from "../redux/actions/api/Transcript/GenerateTranscript"
import SaveTranscriptAPI from "../redux/actions/api/Transcript/SaveTranscript"
import ReactModal from 'react-modal';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

const Style = styled.div`
    position: relative;
    box-shadow: 0px 5px 25px 5px rgb(0 0 0 / 80%);
    background-color: rgb(0 0 0 / 100%);

    .transcribe {
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
        align-items: center;
        border-bottom: 1px solid rgb(255 255 255 / 20%);
        height: 80px;

        .heading {
            h4 {
                margin: 0;
            }
        }

        .options {
            display: flex;
            width: 100%;
            align-items: center;
            justify-content: center;

            span {
                font-size: 18px;
            }
        }
        
        select {
            width: 65%;
            outline: none;
            height: 35px;
            border-radius: 3px;
        }

        .btn {
            opacity: 0.85;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 35px;
            width: 60%;
            border-radius: 3px;
            color: #fff;
            cursor: pointer;
            font-size: 13px;
            background-color: #673ab7;
            transition: all 0.2s ease 0s;
            margin-right: 10px;

            &:hover {
                opacity: 1;
            }
        }
    }

    .reference {
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
        align-items: center;
        height: 80px;
        border-bottom: 1px solid rgb(255 255 255 / 20%);

        h4 {
            margin-bottom: 0;
            margin-top: 0;
        }
    }

    .ReactVirtualized__Table {
        .ReactVirtualized__Table__Grid {
            outline: none;
        }

        .ReactVirtualized__Grid__innerScrollContainer {
            overflow: visible !important;
        }

        .ReactVirtualized__Table__row {
            overflow: visible !important;
            .item {
                height: 100%;
                padding: 10px;

                ul {
                    position: absolute !important;
                    bottom: 200px !important;
                    left: 0 !important;
                    z-index: 9999 !important;
                    height: 170px !important;
                    width: 100% !important;
                    transform: translate(0px, 0px) !important;
                    display: block !important;

                    li {
                        color: #000 !important;
                        border-bottom: 1px solid #999;
                    }
                }

                .textarea {
                    border: none;
                    width: 100%;
                    height: 100%;
                    color: #fff;
                    font-size: 12px;
                    padding: 10px;
                    text-align: center;
                    background-color: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: all 0.2s ease;
                    resize: none;
                    outline: none;

                    word-wrap: break-word;

                    &.highlight {
                        background-color: rgb(0 87 158);
                        border: 1px solid rgba(255, 255, 255, 0.3);
                    }

                    &.illegal {
                        background-color: rgb(123 29 0);
                        border: 1px solid rgba(255, 255, 255, 0.3);
                    }
                }
            }
        }
    }
`;

export default function SameLanguageSubtitles({
    currentIndex,
    subtitle,
    setSubtitleOriginal,
    checkSub,
    player,
    updateSub,
    language,
    setLoading,
    subtitleEnglish,
    formatSub,
    setSubtitle,
    notify,
    isPrimary,
    clearedSubs,
    setClearedSubs,
    updateSubOriginal = null,
    clearSubs,
    configuration,
    setSubtitleEnglish,
    translationApi,
    
}) {
   // console.log('at start ' + subtitle )
    //console.log('at start ' + subtitleEnglish )
    const [height, setHeight] = useState(100);
    const dispatch = useDispatch();
    // const [translate, setTranslate] = useState(null);
    
    //change
    const [transcribe, setTranscribe] = useState(null);
    const [transcribeReq, setTranscribeReq] = useState(false);
    const [languageAvailable, setLanguageAvailable] = useState([]);
    const languageChoices = useSelector(state => state.getTranscriptLanguages.data);
    const Transcript = useSelector(state => state.fetchTranscript.data);
    const GeneratedTranscript = useSelector(state => state.generateTranscript.data);
    const APIStatus = useSelector(state => state.apiStatus);

    const saveTranscript = async () => {
        if (localStorage.getItem('subtitle')) {
            setLoading(t('SAVING'));
            const payload = {
                output: sub2vtt(subtitle)
            }
            const saveObj = new SaveTranscriptAPI(localStorage.getItem("transcript_id"), localStorage.getItem("langTranscribe"), payload);
            const res = await fetch(saveObj.apiEndPoint(), {
                method: "POST",
                body: JSON.stringify(saveObj.getBody()),
                headers: saveObj.getHeaders().headers,
              });
            const resp = await res.json();
            console.log(resp);
            if (res.ok) {
                localStorage.setItem('subtitle', JSON.stringify(subtitle));
                localStorage.setItem('subtitleEnglish', JSON.stringify(subtitle));
                notify({
                    message: 'Subtitle saved successfully', 
                    level: 'success'});
            } else {
                notify({
                    message: 'Subtitle could not be saved', 
                    level: 'error'});
            }
            setLoading('');
        }
    }

    const fetchTranscriptionLanguages = () => {
        const langObj = new GetTranscriptLanguagesAPI();
        dispatch(APITransport(langObj));
    }

    const fetchTranscription = () => {
        const transcriptObj = new FetchTranscriptAPI(localStorage.getItem("videoId"), localStorage.getItem("langTranscribe"), true);
        dispatch(APITransport(transcriptObj));
    }

    const generateTranscription = () => {
        const generateObj = new GenerateTranscriptAPI(localStorage.getItem("videoId"), localStorage.getItem("langTranscribe"));
        dispatch(APITransport(generateObj));
    }
   
    useEffect(() => {
        if (localStorage.getItem('langTranscribe')) {
            setTranscribe(localStorage.getItem('langTranscribe'));
         } else {
            setTranscribe('en');
        }
        fetchTranscriptionLanguages();
    }, []);

    useEffect(() => {
        if (languageChoices?.data) {
            let langArray = [];
            for (const key in languageChoices.data) {
                langArray.push({ name: `${key}`, key: `${languageChoices.data[key]}` });
            }
            setLanguageAvailable(langArray);
            localStorage.setItem('langTranscribe', langArray[0].key);
            setTranscribe(langArray[0].key);
        }
    }, [languageChoices]);
    
    // useEffect(() => {
    //  /*   console.log("languages");
    //         setLanguageAvailable(languages);
    //         localStorage.setItem('lang', languages['en'][1].key);
    //         setTranscribe(languages['en'][1].key);
    //     */
    //         const langObj = new GetTranscriptLanguagesAPI();
    //         // fetch(`${process.env.REACT_APP_ASR_URL}/supported_languages`)
    //         fetch(langObj.apiEndPoint(), {
    //             method: "GET",
    //             headers: langObj.getHeaders().headers,
    //           })
    //         .then((resp) => {
    //             console.log(resp)
    //             return resp.json();
    //         })
    //         .then((resp) => {
    //             let langArray = [];
    //             // langArray.push({ name: 'English', key: 'en' });
    //             for (const key in resp.data) {
    //                 langArray.push({ name: `${key}`, key: `${resp[key]}` });
    //             }
    //             setLanguageAvailable(langArray);
    //             localStorage.setItem('langTranscribe', langArray[0].key);
    //             setTranscribe(langArray[0].key);
    //           //  console.log("transcribe");
    //             console.log(langArray);
    //         })
    //         .catch((err) => {
    //             console.log(err);
    //         });
    // }, []);

    //end of change
    
    //change
    function useStickyState(defaultValue, key) {
        const [value, setValue] = React.useState(() => {
          const stickyValue = window.localStorage.getItem(key);
          return stickyValue !== null
            ? JSON.parse(stickyValue)
            : defaultValue;
        });
        React.useEffect(() => {
          window.localStorage.setItem(key, JSON.stringify(value));
        }, [key, value]);
        return [value, setValue];
      }
    

    const [modeTranscribe, setModeTranscribe] = useStickyState('as', 'transcribed-view');


    const handleBlur = (data, index) => {
        //console.log(e.target.value);
        
        if (isPrimary) {
            return;
        }
        googleTranslate([{ text: data.text }], localStorage.getItem('langTranscribe')).then((resp) => {
            updateSubOriginal(data, resp[0], index);
        });
    }
    /*
    //change
    const handleBlur = (data, index) => {
        //console.log(e.target.value);
        if (isPrimary) {
            return;
        }
        console.log(translationApi);
        if (translationApi === 'AI4Bharat') {
            // return;
            ai4BharatBatchTranslate([{ text: data.text }], 'hi', localStorage.getItem('lang')).then((resp) => {
                updateSubOriginal(data, resp[0], index);
            });
        } else {
            googleTranslate([{ text: data.text }], localStorage.getItem('lang')).then((resp) => {
                updateSubOriginal(data, resp[0], index);
            });
        }
    };
//end of change*/
    const resize = useCallback(() => {
        setHeight(document.body.clientHeight - 240);
    }, [setHeight]);

    useEffect(() => {
        resize();
        if (!resize.init) {
            resize.init = true;
            const debounceResize = debounce(resize, 500);
            window.addEventListener('resize', debounceResize);
        }
    }, [resize]);

    const parseSubtitles = (subtitles) => {
        const suburl = vtt2url(subtitles);
        url2sub(suburl).then((urlsub) => {
            setSubtitle(formatSub(urlsub));
            setSubtitleEnglish(formatSub(urlsub));
            localStorage.setItem('subtitle', JSON.stringify(urlsub));
            localStorage.setItem('subtitleEnglish', JSON.stringify(urlsub));
            setLoading('');
        });
    }

    useEffect(() => {
        console.log(Transcript, "transcript");
        if (transcribeReq && Transcript.data?.output) {
            setTranscribeReq(false);
            localStorage.setItem("transcript_id", Transcript.id);
            parseSubtitles(Transcript.data.output);
        } else if (transcribeReq && APIStatus?.error) {
            generateTranscription();
        }
    }, [Transcript, transcribeReq, APIStatus]);

    useEffect(() => {
        if (transcribeReq && GeneratedTranscript.data?.output) {
            setTranscribeReq(false);
            localStorage.setItem("transcript_id", GeneratedTranscript.id);
            parseSubtitles(GeneratedTranscript.data.output);
        }
    }, [GeneratedTranscript]);

    console.log(GeneratedTranscript, "generate")

//
    const onTranscribe = useCallback(() => {
        // console.log(localStorage.getItem('youtubeURL'));
        // const lang = localStorage.getItem('langTranscribe');
        setLoading(t('TRANSCRIBING'));
        setTranscribeReq(true);
        fetchTranscription();
        // const youtubeURL = localStorage.getItem('youtubeURL');
        //console.log("localstorage transcribe get item " + localStorage.getItem('lang'));
        // const data = {
        //     url: youtubeURL,
        //     vad_level: 2,
        //     chunk_size: 10,
        //     language: lang,
        // };
        //console.log(lang);
        // return fetch(`${process.env.REACT_APP_ASR_URL}/transcribe`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(data),
        // })
        //     .then((resp) => resp.json())
        //     .then((resp) => {
        //         //console.log(resp.output);
        //         player.currentTime = 0;
        //         clearSubs();
        //         const suburl = vtt2url(resp.output);
        //         url2sub(suburl).then((urlsub) => {
        //             setSubtitle(formatSub(urlsub));
        //             setSubtitleEnglish(formatSub(urlsub));
        //             localStorage.setItem('subtitle', JSON.stringify(urlsub));
        //             localStorage.setItem('subtitleEnglish', JSON.stringify(urlsub));
        //         });
        //     })
        //     .then(() => setLoading(''))
        //     .catch((err) => {
        //         console.log(err);
        //         setLoading('');
        //         notify({
        //             message: err.message,
        //             level: 'error',
        //         });
        //     });
    }, [setLoading, formatSub, setSubtitle, notify, clearSubs, player, setSubtitleEnglish]);

    // useEffect(() => {
    //     if (localStorage.getItem('lang')) {
    //         setTranslate(localStorage.getItem('lang'));
    //     } else {
    //         setTranslate('en');
    //     }
    // }, []);
    /*change
    useEffect(() => {
        if (localStorage.getItem('lang')) {
            setTranscribe(localStorage.getItem('lang'));
        } else {
            setTranscribe('en');
        }
    }, []);
    end of change*/
    class TranscriptionModal extends React.Component {
        constructor () {
          super();
          this.state = {
            showTranscriptionModal: false,
            value: ''

          };
          
          this.handleOpenTranscriptionModal = this.handleOpenTranscriptionModal.bind(this);
          this.handleCloseTranscriptionModal = this.handleCloseTranscriptionModal.bind(this);
        }
        
        handleOpenTranscriptionModal () {
          this.setState({ showTranscriptionModal: true });
        }
        
        handleCloseTranscriptionModal () {
          this.setState({ showTranscriptionModal: false });
        }
        
        render () {
            if(configuration=='Same Language Subtitling')
        //     {
        // //  this.handleOpenTranscriptionModal();
        //     }
          return (
            <Style>
            <div>
                <div
                            className="btn"
                            style={{backgroundColor:"#673ab7", color:"white", padding:"10px"}}
                            onClick={() => {
                                // console.log('Configuration - same');
                                // const langTranscribe = localStorage.getItem('lang');
                              
                              //  console.log("lang " + langTranscribe);
                                //   setConfiguration('Same Language Subtitling');
                                //   setIsSetConfiguration(true);
                                  this.handleOpenTranscriptionModal();
                            }}
                        >
                            <Translate value="Open Options" />
                        </div>
                        
              {/* <button onClick={this.handleOpenModal}>Trigger Modal</button> */}
              
              <ReactModal 
                 isOpen={this.state.showTranscriptionModal}
                 style={{
                    overlay: {
                        position: 'absolute',
                        top: '0',
                        background: 'none'
                    },
                    content: {
                      position: 'absolute',
                      color: 'black',
                      top: '150px',
                      left: '30%',
                      bottom: '40px',
                      width: '40%',
                      height: '40%',
                      border: '1px solid #ccc',
                      background: '#fff',
                      overflow: 'auto',
                      WebkitOverflowScrolling: 'touch',
                      borderRadius: '20px',
                      outline: 'none',
                      padding: '20px',
                      zIndex: '1000',
                    },
                  }}
              >
                    {/* { (localStorage.getItem('selectValue') == "video")
                    ? <div>
                        <div>
                            <Tabs defaultIndex={0} onSelect={(index) => console.log(index)}>
                                <TabList>
                                <Tab>Youtube URL</Tab>
                                <Tab>Upload</Tab>
                                </TabList>

                                <TabPanel>
                                <div>
                                        <textarea
                                            className="modal-textarea"
                                            placeholder="Enter YouTube Link Here"
                                            value={youtubeURL}

                                            onChange={handleChange}
                                            // onKeyPress={(e) => }
                                        />
                                        <div className="btn modal-fetch-btn" onClick={onYouTubeChange}>
                                            <Translate value="Fetch Video" />
                                        </div>
                                    </div>
                                </TabPanel>

                                <TabPanel>
                                    <input className="file" type="file" onChange={onVideoChange} onClick={onInputClick} />
                                </TabPanel>
                            </Tabs>
                        </div>    
                        <button onClick={this.handleCloseTranscriptionModal}>Cancel</button>
                    </div>

                    : <div>
                        <div className="btn">
                            <Translate value="OPEN_SUB" />
                            <input className="file" type="file" onChange={onSubtitleChange} onClick={onInputClick} />
                        </div>
                        <button onClick={this.handleCloseTranscriptionModal}>Cancel</button>
                    </div>
                    }  */}
                    <span>
                    <h4 style={{display:"inline-block", marginRight:"10px"}}>Select Language</h4>
                     <select
                                style={{display:"inline-block"}}
                               // value={transcribe == null ? '' : transcribe}
                               value={modeTranscribe}
                                onChange={(event) => {
                                    setModeTranscribe(event.target.value);
                                    localStorage.setItem('langTranscribe', event.target.value);
                                   
                                    //console.log(event.target.value);
                                    //console.log('transcribed view'+localStorage.getItem('transcribed-view'));
                                    setTranscribe(localStorage.getItem('langTranscribe'));
                                
                                    
                                }}
                            >
                                {/* { console.log("transcribe "+localStorage.getItem('langTranscribe'))} */}
                              {/*  <option key="please-select" value="please-select" >Please Select</option> */}
                                {(languageAvailable[language] || languageAvailable.en || languageAvailable).map(
                                    (item) =>
                                        /*item.key !== 'en' && ( */
                                            <option key={item.key} value={item.key}>
                                                {item.name}
                                            </option>
                                      /*  ), */
                                )}
                                
                            </select>
                            </span>

                            <div style={{color: "black", padding: "5px"}}>
                           
                    <h4 style={{display:"inline-block", marginRight:"10px"}}>Select Mode</h4>
                            <span style={{color: "black", padding: "5px"}}>
                            <input type="radio" id="asr" name="asr" value="ASR" />
                            <label for="asr" style={{color: "black", padding: "5px"}}>ASR</label>
                            </span>
                            <span style={{color: "black", padding: "5px"}}>
                            <input type="radio" id="original" name="original" value="OriginalSource" />
                            <label for="original" style={{color: "black", padding: "5px"}}>Original Source</label>
                            </span>
                            </div>

                            <div>
                             <div className="btn" onClick={onTranscribe} style={{display:"inline-block", marginRight:"5px", backgroundColor:"#673ab7", color:"white", padding:"10px"}}>
                                <Translate value="TRANSCRIBE" />
                            </div>
                            <button onClick={this.handleCloseTranscriptionModal} style={{display:"inline-block"}}>Cancel</button>
                            </div>
                            
              </ReactModal>
       
            </div>
                
            </Style>
          );
        }
      }

    return (
        
        // subtitle && 
        // (
            <>
            <TranscriptionModal />
            <Style className="subtitles">
               {/* {console.log('rendering')}
                {console.log(subtitle)}
                {console.log(subtitle.length)}
                {console.log(subtitleEnglish)}
                {console.log("subEng" + subtitleEnglish.length)} */}
            
                {isPrimary && (
                    <div className="transcribe">
                        {/* <div className="heading">
                            <h4>Speech-To-Text  {subtitle?.length > 0 && <span title="Save Transcript" className='save-btn' onClick={saveTranscript}>💾</span>}</h4>
                        </div> */}
                        {/* {console.log('rendering here')} */}
                         <div className="options">
                          {/*  <select
                               // value={transcribe == null ? '' : transcribe}
                               value={modeTranscribe}
                                onChange={(event) => {
                                    setModeTranscribe(event.target.value);
                                    localStorage.setItem('langTranscribe', event.target.value);
                                   
                                    //console.log(event.target.value);
                                    //console.log('transcribed view'+localStorage.getItem('transcribed-view'));
                                    setTranscribe(localStorage.getItem('langTranscribe'));
                                
                                    
                                }}
                            >
                               
                                {(languageAvailable[language] || languageAvailable.en || languageAvailable).map(
                                    (item) =>
                                            <option key={item.key} value={item.key}>
                                                {item.name}
                                            </option>
                                    
                                )}
                                
                            </select> */}
                            
                            {/* <div className="btn" onClick={onTranscribe}>
                                <Translate value="TRANSCRIBE" />
                            </div> */}
                            {/* <span className="language"> : en</span> */}
                        </div>
                    </div>
                )}

                {!isPrimary && (
                    <div className="reference">
                        <h4>Reference Subtitles</h4>
                        <span>Language : {languages['en'].filter((item) => item.key === language)[0].name}</span>
                    </div>
                )}

                <Table
                    headerHeight={40}
                    width={250}
                    height={height}
                    rowHeight={80}
                    scrollToIndex={currentIndex+2}
                    rowCount={subtitleEnglish.length}
                    rowGetter={({ index }) => subtitleEnglish[index]}
                    headerRowRenderer={() => null}
                    rowRenderer={(props) => {
                        return (
                            <div
                                key={props.key}
                                className={props.className}
                                style={props.style}
                                onClick={() => {
                                    if (player) {
                                        player.pause();
                                        if (player.duration >= props.rowData.startTime) {
                                            player.currentTime = props.rowData.startTime + 0.001;
                                        }
                                    }
                                }}
                            >
                                <div className="item">
                                    <ReactTransliterate
                                        className={[
                                            'textarea',
                                            currentIndex === props.index ? 'highlight' : '',
                                            checkSub(props.rowData) ? 'illegal' : '',
                                        ]
                                            .join(' ')
                                            .trim()}
                                        value={unescape(props.rowData.text)}
                                        spellCheck={false}
                                        onChangeText={(event) => {
                                           // console.log(event); //here
                                            updateSub(props.rowData, {
                                                text: event,
                                            });
                                        }}
                                        onBlur={() => handleBlur(props.rowData, props.index)}
                                        enabled={!(!localStorage.getItem('langTranscribe') ||
                                            localStorage.getItem('langTranscribe') === 'en' ||
                                            localStorage.getItem('langTranscribe') === 'en-k')}
                                        lang={localStorage.getItem('langTranscribe')}
                                        // lang={
                                        //     isPrimary
                                        //         ? localStorage.getItem('lang') === 'en-k'
                                        //             ? 'en'
                                        //             : localStorage.getItem('lang')
                                        //         : 'en'
                                        // }
                                        maxOptions={5}
                                        renderComponent={(props) => <textarea {...props} />}
                                    />
                                    {/* <textarea
                                    maxLength={200}
                                    spellCheck={false}
                                    className={[
                                        'textarea',
                                        currentIndex === props.index ? 'highlight' : '',
                                        checkSub(props.rowData) ? 'illegal' : '',
                                    ]
                                        .join(' ')
                                        .trim()}
                                    value={unescape(props.rowData.text)}
                                    onChange={(event) => {
                                        updateSub(props.rowData, {
                                            text: event.target.value,
                                        });
                                    }}
                                /> */}
                                </div>
                            </div>
                        );
                    }}
                ></Table>
            </Style>
            </>
    //    )
    );
}

