const StellarBase = require('stellar-base');
import {Connection} from './connection';
import {QuorumSet} from '@stellarbeat/js-stellar-domain';

export default {

    createScpQuorumSetMessage(hash:Buffer){
        return new StellarBase.xdr.StellarMessage.getScpQuorumset(hash);
    },

    createGetPeersMessage(){
        return new StellarBase.xdr.StellarMessage.getPeer();
    },

    createGetScpStatusMessage(ledgerSequence:number = 0){
        return new StellarBase.xdr.StellarMessage.getScpState(ledgerSequence);
    },

    createAuthMessage: function () {
        let auth = new StellarBase.xdr.Auth({unused: 1});
        return new StellarBase.xdr.StellarMessage.auth(auth);
    },

    createHelloMessage: function (connection: Connection,
                                  stellarNetworkId: Buffer) {
        let hello = new StellarBase.xdr.Hello({ //todo: hardcoded data should come from connection 'fromNode'
            ledgerVersion: 12,
            overlayVersion: 13,
            overlayMinVersion: 8,
            networkId: stellarNetworkId,
            versionStr: 'v12.0.0',
            listeningPort: 11625,
            peerId: connection.keyPair.xdrPublicKey(),
            cert: connection.getAuthCert(stellarNetworkId),
            nonce: connection.localNonce
        });

        return new StellarBase.xdr.StellarMessage.hello(hello);
    },

    isLoadErrorMessage: function (errorMessage: any /*StellarBase.xdr.StellarMessage*/) {
        return errorMessage.code().value === StellarBase.xdr.ErrorCode.fromName("errLoad").value;
    },

    getIpFromPeerAddress: function (peerAddress: any /*StellarBase.xdr.PeerAddress*/) {
        return peerAddress.ip().get()[0] +
            '.' + peerAddress.ip().get()[1] +
            '.' + peerAddress.ip().get()[2] +
            '.' + peerAddress.ip().get()[3];
    },

    getQuorumSetFromMessage: function(scpQuorumSetMessage:any /*StellarBase.xdr.StellarMessage*/) {
        let quorumSet = new QuorumSet(
            StellarBase.hash(scpQuorumSetMessage.toXDR()).toString('base64'),
            scpQuorumSetMessage.threshold()
        );

        scpQuorumSetMessage.validators().forEach((validator:any) => {
            quorumSet.validators.push(StellarBase.StrKey.encodeEd25519PublicKey(validator.get()));
        });

        scpQuorumSetMessage.innerSets().forEach((innerQuorumSet:any) => {
            quorumSet.innerQuorumSets.push(
                this.getQuorumSetFromMessage(innerQuorumSet)
            );
        });

        return quorumSet;
    },

    updateNodeInformation: function(helloMessage: any /*StellarBase.xdr.StellarMessage*/, connection: Connection) { //todo callback
        connection.toNode.publicKey = StellarBase.StrKey.encodeEd25519PublicKey(helloMessage.peerId().get());
        connection.toNode.ledgerVersion = helloMessage.ledgerVersion();
        connection.toNode.overlayVersion = helloMessage.overlayVersion();
        connection.toNode.overlayMinVersion = helloMessage.overlayMinVersion();
        connection.toNode.networkId = helloMessage.networkId().toString('base64');
        connection.toNode.versionStr = helloMessage.versionStr().toString();
        connection.remoteNonce = helloMessage.nonce();
        connection.remotePublicKey = helloMessage.cert().pubkey().key();
    }
};