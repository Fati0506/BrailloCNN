import os, json, numpy as np
os.environ["TF_CPP_MIN_LOG_LEVEL"]="3"
import tensorflow as tf, keras
from keras import layers
@keras.saving.register_keras_serializable(package="braille")
class PerImageStandardize(layers.Layer):
    def call(self, x):
        m=tf.reduce_mean(x,axis=[1,2,3],keepdims=True); v=tf.reduce_mean(tf.square(x-m),axis=[1,2,3],keepdims=True)
        return (x-m)/(tf.sqrt(v)+1e-3)
M="/tmp/nbrun/braille/models/cnndots_s1.keras"
m=keras.saving.load_model(M)
D=np.load("/tmp/nbrun/braille/data/cells28.npz")
X=D["X"].astype("float32")[...,None]/255; y=D["y"].astype(int); sp=D["split"]
te=sp=="test"
p=m.predict(X[te],batch_size=1024,verbose=0)
bits=p>0.5; e=~bits.any(1); bits[e,p[e].argmax(1)]=True
pat=(bits*(1<<np.arange(6))).sum(1)
print("TEST acc cnndots_s1:",(pat==y[te]).mean())
# export folded weights
ops=[]; Ls=m.layers; i=0; 
def r(a): return np.round(np.asarray(a,dtype="float64"),5).ravel().tolist()
while i<len(Ls):
    L=Ls[i]; n=L.__class__.__name__
    if n=="Conv2D":
        k=L.get_weights()[0]; bn=Ls[i+1]; g,b,mu,var=bn.get_weights(); s=g/np.sqrt(var+bn.epsilon)
        ops.append(dict(t="conv",kh=3,cin=k.shape[2],cout=k.shape[3],w=r(k*s),b=r(b-mu*s))); i+=3  # conv,bn,relu
        continue
    if n=="MaxPooling2D": ops.append(dict(t="pool"))
    elif n=="GlobalAveragePooling2D": ops.append(dict(t="gap"))
    elif n=="Dense":
        w,b=L.get_weights(); ops.append(dict(t="dense",nin=w.shape[0],nout=w.shape[1],act=L.activation.__name__,w=r(w),b=r(b)))
    elif n=="PerImageStandardize": ops.append(dict(t="std"))
    i+=1
json.dump(dict(kind="cnndots",ops=ops),open("/home/claude/braille-cnn-peru/web/model/braille_cnn.json","w"),separators=(",",":"))
print([o["t"] for o in ops], os.path.getsize("/home/claude/braille-cnn-peru/web/model/braille_cnn.json")//1024,"KB")
# reference outputs for JS parity test + demo strip
rng=np.random.default_rng(3); idx=rng.choice(np.where(te)[0],40,replace=False)
ref=m.predict(X[idx],verbose=0)
json.dump(dict(x=[(D["X"][i]).ravel().tolist() for i in idx],y=ref.tolist()),open("/tmp/parity.json","w"))
from PIL import Image
LP={'h':(1,2,5),'o':(1,3,5),'l':(1,2,3),'a':(1,),'i':(2,4),'m':(1,3,4)}
pat_of=lambda d:sum(1<<(k-1) for k in d)
def strip(word,name):
    cells=[]; r2=np.random.default_rng(11)
    for ch in word:
        if ch==" ": cells.append(np.full((28,28),200,np.uint8)); continue
        c=np.where((y==pat_of(LP[ch]))&te)[0]; cells.append(D["X"][int(r2.choice(c))])
    big=np.concatenate([np.array(Image.fromarray(c).resize((112,112),Image.BICUBIC)) for c in cells],1)
    Image.fromarray(big).save(name)
strip("hola lima","/home/claude/braille-cnn-peru/web/assets/demo_hola_lima.png")
