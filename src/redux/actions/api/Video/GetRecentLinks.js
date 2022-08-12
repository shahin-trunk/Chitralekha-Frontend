/**
 * Login API
 */
 import API from "../../../api";
 import ENDPOINTS from "../../../../config/apiendpoint";
 import constants from "../../../constants";
 
 export default class GetRecentLinksAPI extends API {
   constructor(count=null, timeout = 2000) {
     super("GET", timeout, false);
     this.type = constants.GET_RECENT_LINKS
     this.endpoint = `${super.apiEndPointAuto()}${ENDPOINTS.video}list_recent${count ? 'count=' + count : ''}`;
   }
 
   processResponse(res) {
     super.processResponse(res);
     if (res) {
         this.list = res;
     }
 }
 
   apiEndPoint() {
     return this.endpoint;
   }
 
   getBody() {}
 
   getHeaders() {
     this.headers = {
       headers: {
         "Content-Type": "application/json",
         ...(localStorage.getItem('chitralekha_access_token')) && {"Authorization":`Token ${localStorage.getItem('chitralekha_access_token')}`}
       },
     };
     return this.headers;
   }
 
   getPayload() {
     return this.list
   }
 }
 