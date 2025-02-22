

import googleButton from '../assets/google_signin_buttons/web/1x/btn_google_signin_dark_pressed_web.png'
import './GoogleButton.css'

function navigate(url){
    window.location.href = url;
}

async function auth(){
    const response =await fetch('http://127.0.0.1:5000/api/auth/googleAuthRequest',{method:'post'});

    const data = await response.json();
    console.log(data);
    navigate(data.url);

}

function GoogleButton() {


    return (
        <>
            <button className="btn-auth"  type="button" onClick={()=> auth()}>
                <img className="btn-auth-img" src={googleButton} alt='google sign in'/>
            </button>
        </>
    )
}

export default GoogleButton