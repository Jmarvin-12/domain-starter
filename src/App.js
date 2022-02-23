import React, { useEffect, useState } from 'react';
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import MacroBlockchainLogo from "./assets/MacroBlockchainLogo.jpg";
import ethLogo from "./assets/ethlogo.png";
import polygonLogo from "./assets/polygonlogo.png";
import { ethers } from 'ethers';
import contractDomain from './utils/Domains.json'
import { networks } from './utils/networks'

// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const tld = '.MacroBlockchain';
const CONTRACT_ADDRESS = '0xba19dc01d7ad5655EADD230aA5fB292DbFaafdA9';

const App = () => {

	const [ currentAccount, setCurrentAccount] = useState('');

	const [ domain, setDomain] = useState('');

	const [ record, setRecord] = useState('');

	const [ network, setNework] = useState('');

	const [ editing, setEditing ] = useState('');

	const [ mints, setMints] = useState('');

	const [ loading, setLoading] = useState('');

	//Funcion para conectar wallet al sitio
	const connectWallet = async () => {

		try{
			const { ethereum } = window;

			if(!ethereum) {
				alert("Descargue metamask -> https://metamask.io/")
				return;
			}

			const accounts = await ethereum.request({method: 'eth_requestAccounts'});

			console.log("%s conectada", accounts[0]);
			setCurrentAccount(accounts[0]);

		}catch( error ){
			console.log(error);
		}
	}

	const checkIfWalletIsConnected= async() => {

		const { ethereum } = window;

		if(!ethereum) {
			console.log("Asegurese de tener metamask instalado");
			return;
		}else {
			console.log("Ethereum Object identificado: ", ethereum);
		}

		const accounts = await ethereum.request({method: 'eth_accounts'});
		
		if(accounts.length !== 0) {
			const account = accounts[0];
			console.log("Cuenta autorizada: ", account);
			setCurrentAccount(account);
		}else {
			console.log("No se encontro cuenta autorizada");
		}

		//Verifica el chainId del que esta conectado el usuario
		const chainId = await ethereum.request({method: 'eth_chainId'});
		setNework(networks[chainId]);

		ethereum.on('chainChanged', handleChainChanged)

		//Recarga pagina si cambian de chain id
		function handleChainChanged(_chainId) {
			window.location.reload();
		}

	}

	// Funcion para que el usuario pueda cambiar de red presionando un boton
	const switchNetwork = async () => {
		if(window.ethereum) {

			try{
				// Intentar cambiar a Mumbai Testnet
				await window.ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: '0x13881'}],
				});
			}catch(error){
				if(error.code === 4902){
					try{
						// Aparece ventana para que el usuario agruege la red si no se encuentra en la wallet
						await window.ethereum.request({
							method: 'wallet_switchEthereumChain',
							params: [
								{
									chainId: '0x13881',
									chainName: 'Polygon Mumbai Testnet',
									rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
									nativeCurrency: {
										name: "Mumbai Matic",
										symbol: "Matic",
										decimals: 18
									},
									blockExploreUrls: ["https://mumbai.polygonscan.com/"]
								},
							],
						});
					}catch (error) {
						console.log(error);
					}
				}
				
				console.log("Fijese que le da un errocito: ", error);
			}
		}else {
			console.log("Metamask no esta instalado, instalelo aqui https://metamask.io/download.html");
		}
	}


	const mintDomain = async () => {
		//No corre la funcion si el dominio del formulario esta vacio
		if(!domain) { return; }
		//Alerta si el dominio ingresado es muy corto
		if(domain.length < 3) {
			alert("Fijese que muy corto el dominio que quiere registrar, tiene que ser al menos de 3 chars de largo");
			return;
		}

		//Ajuste de precio sobre el dominio, los dominios mas cortos son mas caros
		const price = domain.length === 3 ? '0.5' : domain.length === 4 ? '0.3' : '0.1';
		console.log("Mintiando el dominio %s por un precio de %s", domain, price);
		
		try{
			const { ethereum } = window;

			if(ethereum){
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractDomain.abi, signer);

				console.log("Debe de abrir consola para pagar");
				let tx = await contract.register(domain, {value: ethers.utils.parseEther(price)})

				const receipt = await tx.wait();

				//Verificar si la transaccion fue completada exitosamente
				if(receipt.status === 1){
					console.log("Se minteo el dominio man, puede ver la transaccion en https://mumbai.polygonscan.com/tx/"+tx.hash);

					tx = await contract.setRecord(domain, record);
					await tx.wait();

					console.log("Record guardado man, puede ver la transaccion en https://mumbai.polygonscan.com/tx/"+tx.hash);

					setTimeout(() => {
						fetchMints();
					}, 2000);

					setRecord('');
					setDomain('');
				}else{
					alert("Fijese que no se porque, pero la transaccion fallo, intentelo de nuevo o vaya a dormir");
				}

			}

		}catch(error){
			console.log("Fijese que da este error: ", error);
		}


	}

	//Obtener todos los dominios minteados
	const fetchMints = async() => {
		
		try{
			const {ethereum} = window;

			if(ethereum) {

				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractDomain.abi, signer);

				const names = await contract.getAllNames();

				const mintRecords = await Promise.all(names.map(async (name) => {
				const mintRecord = await contract.records(name);
				const owner = await contract.domains(name);
					return {
						id: names.indexOf(name),
						name: name,
						record: mintRecord,
						owner: owner
					};
				}));

				console.log("Minted fetch: ", mintRecords);
				setMints(mintRecords);
			}
		}catch(error) {
			console.log("Fijese que fallo en obtener los minteados: ", error);
		}

	}

	useEffect(() => {
		if (network === 'Polygon Mumbai Testnet') {
			fetchMints();
		}
	}, [currentAccount, network]);


	const renderMints =  () => {
		if( currentAccount && mints.length > 0) {
			return (
				<div className="mint-container">
					<p className='subtitle'>Dominios recien minteados!</p>
					<div className='mint-list'>
						{ mints.map((mint, index) => {
							return(
								<div className="mint-item" key={index}>
									<div className='mint-row'>
										<a className='link' href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`} target="_blank" rel="noopener noreferrer">
											<p className='underlined'>{' '}{mint.name}{tld}{' '}</p>
										</a>
									

										{ mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
											<button className="edit-button" onClick={() => editRecord(mint.name)}>
												<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
											</button>
											:
											null
										}
									</div>
									
									<p>{mint.record}</p>

								</div>
							)
						})}
					</div>
				</div>
			);
		}
	};

	const editRecord = (name) => {
		console.log("Editando registro para dominio: ", name);
		setEditing(true);
		setDomain(name);
	}

	// Actualizar registros en dominio
	const updateDomain = async() => {

		if(!record || !domain) { return }

		setLoading(true);

		console.log("Actualizando dominio %s con registro %s ", domain, record);

		try{
			const {ethereum} = window;

			if(ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer =  provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractDomain.abi, signer);

				let tx = await contract.setRecord(domain, record);
				await tx.wait();
				console.log("Registro realizado, ver transaccion en: https://mumbai.polygonscan.com/tx/"+tx.hash);

				fetchMints();
				setRecord('');
				setDomain('');
			}

		}catch(error) {
			console.log("Fijese que da otro error esta onda: ", error);
		}

		setLoading(false);
	}


	const renderNotConnectedContainer = () => (
		<div className="connect-wallet-container">
			<img src="https://media.giphy.com/media/3ohhwytHcusSCXXOUg/giphy.gif" alt="Ninja gif" />
			<button onClick={connectWallet} className="cta-button connect-wallet-button">
				Connect Wallet
			</button>
		</div>
	);

	//Formulario para que el usuario ingrese el nombre de dominio y el registro de informacion sobre un dominio
	const renderInputForm = () => {

		if(network !== 'Polygon Mumbai Testnet') {
			return (
				<div className='connect-wallet-container'>
					<p>Conectese a la Polygon Mumbai Testnet</p>
					<button className="cta-button mint-button" onClick={switchNetwork}>Cambiar de red</button>
				</div>
			);
		}

		return(
			<div className="form-container">
				<div className="first-row">
					<input
						type="text"
						value={domain}
						placeholder="domain"
						onChange={e => setDomain(e.target.value)}
					/>
					<p className='tld'> {tld} </p>
				</div>

				<input
					type="text"
					value={record}
					placeholder="data"
					onChange={e => setRecord(e.target.value)}
				/>

				{/** Si el estado de editing es true retorna los botones setRecord y cancel para actualizar registros */}
				{editing ? (
					<div className="button-container">
						<button className="cta-button mint-button" disabled={loading} onClick={updateDomain}>
							Establecer registro
						</button>
						<button className="cta-button mint-button" onClick={() => {setEditing(false)}}>
							Cancelar
						</button>
					</div>
				) : (
					<div className="button-container">
						<button className="cta-button mint-button" disabled={loading} onClick={mintDomain}>
							Mintear
						</button>
					{/* <button className="cta-button mint-button" disable={null} onClick={null}>
						Registrar data
					</button> */}
					</div>
				)}

			</div>
		);
	};

	useEffect(() => {
		checkIfWalletIsConnected();
	}, [])

  return (
		<div className="App">
			<div className="container">

				<div className="header-container">
					<header>
						<div className="left">
							<p className="title"><img src={MacroBlockchainLogo} alt="Macro logo" width={60} height={60}></img> MacroBlockchain Name Service</p>
							<p className="subtitle">Your immortal API on the blockchain!</p>
						</div>

						<div className="right">
							<img alt='network logo' className="logo" src={ network.includes("Polygon") ? polygonLogo : ethLogo} />
							{ currentAccount ? <p> Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> No esta conectado</p>}
						</div>
					</header>
				</div>
				
				{/** El boton para conectar cartera no aparecera si currentAccount tiene una cuenta */}
				{!currentAccount && renderNotConnectedContainer()}
				{/** Renderizar el formulario si una cuenta esta connectada */}
				{currentAccount && renderInputForm()}

				{mints && renderMints()}

        		<div className="footer-container">
					<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
					<a
						className="footer-text"
						href={TWITTER_LINK}
						target="_blank"
						rel="noreferrer"
					>{`built with @${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	);
}

export default App;
