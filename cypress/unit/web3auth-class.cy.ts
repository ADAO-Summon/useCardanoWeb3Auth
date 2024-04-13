import { Web3Auth } from "../../src/utils/web3auth";
import { web } from "webpack";
import jwt from 'jsonwebtoken';
import { Emulator, Lucid, TxComplete, TxSigned } from "lucid-cardano";
import dotenv from 'dotenv';
dotenv.config();
const oAuthClients: { [key: string]: { name: string, clientId: string, verifier: string } } = {
    /* discord: {
      name: "discord",
      clientId: "1179814953654423603",
      verifier: "summon-discord"
    }, */
    google: {
        name: "google",
        clientId: "270914932394-dmpe4q3hfrbvt3loij6n50n22av9lmk0.apps.googleusercontent.com",
        verifier: "summon"
    },
    twitter: {
        name: "jwt",
        clientId: "wOO2G3FWdrDYH6p9D5fkBJtAPtPgT3K2",
        verifier: "summon-twitter"
    },
    github: {
        name: "jwt",
        clientId: "wOO2G3FWdrDYH6p9D5fkBJtAPtPgT3K2",
        verifier: "summon-github"
    }

}

const cardanoNetwork = "Preprod";
let web3auth: Web3Auth | null = null;
let lucid: Lucid;
let mockJWT: string;

describe("instantiates web3auth class", () => {
    it("instantiates web3auth", () => {
        cy.wrap(Web3Auth.getInstance(oAuthClients, cardanoNetwork, process.env.BLOCKFROST_PROJECT_ID as string, process.env.BLOCKFROST_URL as string, "home", window.location.origin, process.env.WEB3AUTH_CLIENT_ID as string)).then((wa: any) => {
            web3auth = wa;
            expect(web3auth).to.have.property('initialize');
        });
    });
    it("initializes web3auth", () => {
        cy.wrap(web3auth!.initialize()).then((res: any) => {
            expect(web3auth!.coreKitInstance).to.have.property('status');
            expect(web3auth!.coreKitInstance.status).to.equal("INITIALIZED");
        });
    });
    it("logs in to web3auth", () => {
        cy.wrap(fetch("http://localhost:3000/api/get-test-jwt")).then((res: any) => {
            return res.json();
        }).then((data) => {
            mockJWT = data.jwt;
            cy.log("status", web3auth!.coreKitInstance.status);
            //  sub = jwt.decode(mockJWT)?.sub as string;
            cy.wrap(web3auth!.login("jwt", data.jwt)).then((res: any) => {
                cy.log("status", web3auth!.coreKitInstance.status);
                console.log(web3auth!.coreKitInstance.tKey);
                expect(web3auth!.coreKitInstance.status).to.equal("LOGGED_IN");
                expect(web3auth!.coreKitInstance).to.have.property("tKey");
                expect(web3auth!.coreKitInstance.tKey.privKey).to.not.be.null;
            });
        });

    });
    it("initializes blockain accounts", () => {
        cy.wrap(web3auth!.initializeBlockchainAccounts()).then((res: any) => {
            expect(web3auth!.status).to.equal("accounts_created");
            /* expect(web3auth!.cardanoPaymentKey).to.not.be.null;
            expect(web3auth!.cardanoStakeKey).to.not.be.null;
            expect(web3auth!.solanaKeyPair).to.not.be.null;
            expect(web3auth!.ethProvider).to.not.be.null;

            expect(web3auth!.solanaKeyPair).to.have.property("publicKey");
            expect(web3auth!.solanaKeyPair).to.have.property("secretKey"); */
        });
    });

    it("logs out of web3auth", () => {
        cy.wrap(web3auth!.logout()).then((res: any) => {
            expect(web3auth!.coreKitInstance.status).to.not.equal("LOGGED_IN");
        });
    });

    //clean up
    web3auth = null;

});

describe("does the full login at once", () => {
    console.log(process.env.WEB3AUTH_CLIENT_ID as string, "web3auth")
    it("instantiates web3auth", () => {
        cy.wrap(Web3Auth.getInstance(oAuthClients, cardanoNetwork, process.env.BLOCKFROST_PROJECT_ID as string, process.env.BLOCKFROST_URL as string, "home", window.location.origin, process.env.WEB3AUTH_CLIENT_ID as string)).then((wa: any) => {
            web3auth = wa;
            expect(web3auth).to.have.property('initialize');
        });
    });
    it("logs in and initializes blockchain accounts", () => {
        cy.wrap(fetch("http://localhost:3000/api/get-test-jwt")).then((res: any) => {
            return res.json();
        }).then((data) => {
            mockJWT = data.jwt;
            cy.log("status", web3auth!.coreKitInstance.status);
            cy.wrap(web3auth!.fullLogin("jwt", mockJWT)).then((res: any) => {
                expect(web3auth!.status).to.equal("full_login");
                expect(web3auth!.coreKitInstance.status).to.equal("LOGGED_IN");
                expect(web3auth!.coreKitInstance).to.have.property("tKey");
                expect(web3auth!.coreKitInstance.tKey.privKey).to.not.be.null;
                /* expect(web3auth!.cardanoPaymentKey).to.not.be.null;
                expect(web3auth!.cardanoStakeKey).to.not.be.null;
                expect(web3auth!.solanaKeyPair).to.not.be.null;
                expect(web3auth!.ethProvider).to.not.be.null;
                expect(web3auth!.solanaKeyPair).to.have.property("publicKey");
                expect(web3auth!.solanaKeyPair).to.have.property("secretKey"); */
                expect(web3auth!.cardanoAddress).to.be.a('string');
                expect(web3auth!.cardanoAddress).to.have.lengthOf(108);
                expect(web3auth!.cardanoWalletAPI).to.not.be.null;
                cy.wrap(web3auth!.cardanoWalletAPI!.getUnusedAddresses()).then((addresses: any) => {
                    console.log({ addresses })
                    expect(addresses).to.have.lengthOf(1);
                })
            });
        });
    });
})


describe('successfully uses the wallet API', () => {
    const initialAda = 300000000000n;

    let emulator: Emulator;
    // walletAPI = new Web3AuthWalletAPI(paymentKey, stakeKey, process.env.BLOCKFROST_NETWORK as Network, process.env.BLOCKFROST_PROJECT_ID as string, process.env.BLOCKFROST_URL as string);
    it('instantiates the wallet API', () => {
        cy.wrap(new Emulator(
            [
                { address: web3auth!.cardanoAddress, assets: { ['lovelace']: initialAda } },
                //{ address: receiverAddress, assets: { ['lovelace']: 0n } },

            ]
        )).then((em: any) => {
            emulator = em;
            cy.wrap(web3auth!.initializeWalletAPI(emulator)).then((res: any) => {
                expect(web3auth!.cardanoWalletAPI).to.not.be.null;
                expect(web3auth!.cardanoAddress).to.be.a('string');
                expect(web3auth!.cardanoAddress).to.have.lengthOf(108);

            });
        })
    })
    it('works with Lucid', () => {
        cy.wrap(Lucid.new(emulator)).then((l: any) => {
            lucid = l;
            //lucid.selectWallet(walletAPI);
            lucid.selectWallet(web3auth!.cardanoWalletAPI!)
            cy.wrap(lucid.wallet.address()).then((lucidAddress: any) => {
                expect(lucidAddress).to.equal(web3auth!.cardanoAddress);
            })

            cy.wrap(emulator.awaitBlock(1)).then(() => {
                cy.wrap(lucid.wallet.getUtxos()).then((utxos: any) => {
                    console.log({ utxos })
                    cy.log(utxos)
                })
                //  expect(utxos).to.have.lengthOf(1);
            })
        })
    })

    let txComplete: TxComplete;
    it('builds a transaction', () => {
        cy.log(lucid.network)
        cy.wrap(buildTransaction(lucid, web3auth!.cardanoAddress)).then((tx: any) => {
            txComplete = tx;
            cy.log(tx.toString())
        })
    })
    let signedTx: TxSigned;
    it('signs a transaction using Lucid', () => {
        cy.wrap(txComplete.sign().complete()).then((signed: any) => {
            signedTx = signed;
            cy.log(signedTx.toString())
        })
    })

    it('submits a transaction', () => {
        cy.wrap(signedTx.submit()).then((txHash: any) => {
            cy.log(txHash)
            expect(txHash).to.be.a('string');
            expect(txHash).to.have.lengthOf(64);
        })
    })

})

const buildTransaction = async (lucid: Lucid, receiverAddress: string) => {
    const tx = await lucid.newTx()
        .payToAddress(receiverAddress, { lovelace: 2000000n }) //pay 2 ada
        .complete()
    return tx
}