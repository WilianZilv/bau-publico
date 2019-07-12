import React, { Component, useState } from 'react'

import Icon from 'antd/lib/icon'
import message from 'antd/lib/message'
import Button from 'antd/lib/button'
import Affix from 'antd/lib/affix'
import Modal from 'antd/lib/modal'

import 'antd/lib/icon/style/css'
import 'antd/lib/message/style/css'
import 'antd/lib/button/style/css'
import 'antd/lib/affix/style/css'
import 'antd/lib/modal/style/css'
import 'antd/lib/input/style/css'

import CreatePost from './CreatePost'
import './App.css'
import StackGrid from "react-stack-grid";
import copy from 'copy-to-clipboard';
import Api from './api'
import { SizeMe } from 'react-sizeme'

const Label = ({text, count, onClick, refresh}) => {
    return (
        <div style={{display: 'flex', margin: 16, justifyContent: 'center'}}>
            <span style={{fontSize: 20, fontWeight: 'bold', marginRight: 16}}>{text}</span>
            {count && <Button onClick={() => onClick()} type='primary' shape='round'>+{count}</Button>}
            {refresh && <Button onClick={() => refresh()} type='primary' shape='round'>Atualizar</Button>}
        </div>
    ) 
}

class App extends Component {

    constructor(props){
        super(props)
        this.state={posts: [], top:[], loading: false, visits: null, newPosts: null}
    }
    componentDidMount(){
        this.load()
    }
    disableLoading(){
        setTimeout(() => {
            this.setState({loading: false})
        }, 500)
    }
    loadTop(){

        Api.execute("?top=1")
        .then(data => {
            if(data){
                this.setState({top: data})
            }
        })
        .catch(e => console.log(e))
    }
    checkNewPosts(){

    }
    load(reset=false){
        
        if(this.state.loading){
            return
        }
        this.setState({loading: true})

        let route = "?posts=-1"
        if(this.state.posts.length > 0 && !reset){
            route = "?posts="+this.state.posts[this.state.posts.length-1].id
        }
        Api.execute(route)
        .then(posts => {
            
            if(posts){
            
                if(reset){
                    this.setState({posts: posts, newPosts: null})
                }else{
                    this.setState({posts: this.state.posts.concat(posts)})
                }
            }
            this.disableLoading()
        })
        .catch(err => {
            this.disableLoading()
        })

        this.loadTop()
    }
    updateLikes(data, top=false){

        let posts = !top ? this.state.posts : this.state.top

        posts.map((item, key) => {
            
            if(item.id === data.id){
                posts[key].likes = data.likes
                posts[key].liked = data.liked
            }
        })

        if(top){
            this.setState({top: posts})
        }else{

            this.setState({posts: posts})
        }
    }

    render(){
        return (
            <SizeMe
            render={({size}) => (
                
            
                <div style={{display: 'flex', flexDirection: 'column'}}>
                    <Affix offsetTop={0}>

                    <div className='header'>
                        <Icon type="inbox"/>
                        <span style={{fontSize: 22, fontWeight: 'bolder', marginLeft: 8, marginRight: 16}}>Baú Público</span>
                        <div className='selectable' onClick={() => Modal.confirm({
                                icon: 'heart',
                                title: 'Apoiar o Baú',
                                content: 'Me ajude a comprar fraldas e apoiar o Baú Público fazendo uma doação :)',
                                okText: 'Doar com Paypal',
                                cancelText: 'Agora não',
                                onOk: () => {
                                    window.open('https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=4HQ6WLLTRUVEU&source=url')
                                }
                            })}>
                            <Icon type='heart' theme='filled' className='heart-style'/>
                            <span style={{marginLeft: 8, fontWeight: 'bold'}}>Apoiar</span>
                        </div>
                    </div>
                    </Affix>

                    <div className='margin' style={{display: 'flex', flexDirection: 'column', alignContent: 'center'}}>

                        {this.state.top.length > 0 && <Label text="Itens mais valiosos de hoje!" refresh={() => this.loadTop()}/>}

                        <StackGrid className="" columnWidth={size.width <= 768 ? '50%' : '12%'}>
                        {
                            this.state.top.map((item, key) =>{
                                return <Item key={key} updateLikes={data => this.updateLikes(data, true)} data={item}/>
                            })
                        }
                        </StackGrid>
                        {this.state.posts.length > 0 && <Label count={this.state.newPosts} onClick={() => this.load(true)} text="Feed"/>}
                        
                        <CreatePost mobile={size.width <= 768} reload={(x) => this.load(x)}/>
                        
                        <StackGrid className="margin-top" columnWidth={size.width <= 768 ? '50%' : '12%'}>
                        {
                            this.state.posts.map((item, key) =>{
                                return <Item key={key} updateLikes={data => this.updateLikes(data)} data={item}/>
                            })
                        }
                        </StackGrid>
    
                        <Button style={size.width <= 768 ? {} : {width : '50%', alignSelf: 'center'}} onClick={() => this.load()} 
                        type='primary'
                        loading={this.state.loading} size='large' className='shadow margin-top'>{this.state.loading ? "Carregando" : "Mostrar mais"}</Button>
                    </div>
                
                </div>
            )}/>
    );
}
}

const Item = ({ data, updateLikes }) => {

    let [loading, setLoading] = useState(false)

    const handleClick = () => {
        copy(data.text)
        message.success(`"${data.text}" copiado!`)
    }
    const like = () => {
        
        setLoading(true)
        Api.execute(`?like=${data.id}`)
        .then(response => {
            updateLikes({...{id: data.id}, ...response})
            setLoading(false)
        })
        .catch(e => setLoading(false))
    }

    const extractLink = (text) => {

        let list = text.split(' ')
        let link = null
        let noLink = ''
        list.map((item, key) => {

            let add = true
            if(item.startsWith('http')){
                if(item.endsWith('.png') || item.endsWith('.jpg') || item.endsWith('.jpeg') || item.endsWith('.gif')){
                    link = item
                    add = false
                }
            }
            if(add){
                noLink += item + ' '
            }
            
        })
        return [link, noLink]
    }

    let [link, noLink] = extractLink(data.text)
        
    return(
        <div style={{display: 'flex', flexDirection: 'column'}} className='paper-no-padding selectable truncate'>
            {noLink && <span className={'item-text ' + (link ? '' : 'margin-bottom48px')} onClick={() => handleClick()}>{noLink}</span>}
            {link && <img className='item-image' onClick={() => handleClick()} src={link}/>}
            <div className={'like-container '+(link ? 'fade' : '')} onClick={() => loading ? null : like()}>
                <div className='like'>
                    <Icon type={loading ? 'loading' : 'heart'} theme={loading ? 'outlined' : (data.liked == 1 ? 'filled' : 'outlined')} style={{marginRight: 8, color: 'red'}}/>
                    <span style={{color: 'red'}}>{data.likes}</span>  
                </div>
            </div>
        </div>
    )
    
}

export default App;
