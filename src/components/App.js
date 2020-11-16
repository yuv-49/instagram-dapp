import React, { Component } from 'react';
import Web3 from 'web3';
import Identicon from 'identicon.js';
import './App.css';
import Decentragram from '../abis/Decentragram.json'
import Navbar from './Navbar'
import Main from './Main'

const ipfsClient = require('ipfs-http-client');
const ipfs = ipfsClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });

class App extends Component {

  constructor(props) {
    super(props)
    this.state = {
      account: '',
      decentragram: null,
      imageCount: 0,
      images: [],
      loading: true,
      buffer: ''
    }
  }

  async componentWillMount() {
    await this.loadWeb3();
    await this.loadBlockchainData();
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  }

  async loadBlockchainData() {
    const web3 = window.web3;

    const account = await web3.eth.getAccounts();

    this.setState({ account: account[0] })

    console.log("acc...", account)

    const networkId = await web3.eth.net.getId();
    const networkData = Decentragram.networks[networkId];

    if (networkData) {
      const decentragram = web3.eth.Contract(Decentragram.abi, networkData.address)
      const imageCount = await decentragram.methods.imageCount().call()
      this.setState({ decentragram, imageCount, loading: false })

      for (var i = 1; i <= imageCount; i++) {
        const image = await decentragram.methods.images(i).call()
        this.setState({
          images: [...this.state.images, image]
        })
      }

      this.setState({
        images: this.state.images.sort((a, b) => b.tipAmount - a.tipAmount)
      })
      
    } else {
      alert("dec. blockchain not here")
    }
  }

  captureFile = event => {
    event.preventDefault();
    const file = event.target.files[0];
    const reader = new window.FileReader();
    reader.readAsArrayBuffer(file);

    reader.onloadend = () => {
      this.setState({ buffer: Buffer(reader.result) })
      console.log("buffer", this.state.buffer)
    }
  }


  uploadImage = description => {
    console.log("submitting to ipfs...")

    ipfs.add(this.state.buffer, (error, result) => {
      if (error) {
        alert(error);
        return;
      }

      this.setState({ loading: true });
      this.state.decentragram.methods.uploadImage(result[0].hash, description).send({ from: this.state.account })
        .on('transactionHash', hash => {
          this.setState({ loading: false })
        })

    })
  }

  tipImageOwner = (id, tipAmount) => {
    this.setState({ loading: true });

    this.state.decentragram.methods.tipImageOwner(id).send({ from:this.state.account, value: tipAmount })
      .on('transactionHash', hash => {
        this.setState({ loading: false })
      })
  }

  render() {
    return (
      <div>
        <Navbar account={this.state.account} />
        { this.state.loading
          ? <div id="loader" className="text-center mt-5"><p>Loading...</p></div>
          : <Main
              images={this.state.images}
              tipImageOwner={this.tipImageOwner}
              captureFile={this.captureFile}
              uploadImage={this.uploadImage}
            />
        }
      </div>
    );
  }
}

export default App;