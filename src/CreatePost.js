import React, { useState } from 'react'

import Input from 'antd/lib/input'
import message from 'antd/lib/message'
import Button from 'antd/lib/button'

import Api from './api'

function CreatePost({ reload, mobile }) {
    
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(false)
    
    const post = () => {
        setLoading(true)
        
        Api.execute("?text="+text)
        .then(data => {

            reload(true)
            setLoading(false)

            try{

                message.info(data.msg)
            }catch(err){
                setText('')
            }

        })
        .catch(() => null)
    }
    return (

            <div className='paper' style={mobile ? {} : {width: '25%', alignSelf: 'center'}}>
                <Input style={{marginBottom: 16}} onChange={(x) => setText(x.target.value)} value={text} placeholder="O que quer guardar?"/>
                {text !== '' && <Button loading={loading} onClick={post} type="primary" block>Guardar</Button>}
            </div>

    )
}
export default CreatePost