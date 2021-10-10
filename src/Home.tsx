import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Button, CircularProgress, Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import { makeStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import SolanaLogo from "./sol_logo.svg";
import ArtMuseum from "./art.svg"
import Grid from "@material-ui/core/Grid";
import AccountBalanceWalletIcon from "@material-ui/icons/AccountBalanceWallet";
import Chip from "@material-ui/core/Chip";
import * as anchor from "@project-serum/anchor";

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-material-ui";

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
} from "./candy-machine";

const ConnectButton = styled(WalletMultiButton)``;

const CounterText = styled.span``; // add your styles here

const MintContainer = styled.div``; // add your styles here

const MintButton = styled(Button)``; // add your styles here

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
}));

const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [itemsRedeemed, setItemsRedeemed] = useState(0);
  const [itemsRemaining, setItemsRemaining] = useState(0);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useAnchorWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const refreshCandyMachineState = () => {
    (async () => {
      if (!wallet) return;

      const {
        candyMachine,
        goLiveDate,
        itemsAvailable,
        itemsRemaining,
        itemsRedeemed,
      } = await getCandyMachineState(
        wallet as anchor.Wallet,
        props.candyMachineId,
        props.connection
      );

      setItemsAvailable(itemsAvailable);
      setItemsRemaining(itemsRemaining);
      setItemsRedeemed(itemsRedeemed);

      setIsSoldOut(itemsRemaining === 0);
      setStartDate(goLiveDate);
      setCandyMachine(candyMachine);
    })();
  };

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet && candyMachine?.program) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          false
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message:
              "Congratulations! Mint succeeded! Please check your wallet now",
            severity: "success",
          });
        } else {
          setAlertState({
            open: true,
            message: "Mint failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
      refreshCandyMachineState();
    }
  };

  useEffect(() => {
    (async () => {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(refreshCandyMachineState, [
    wallet,
    props.candyMachineId,
    props.connection,
  ]);

  const classes = useStyles();

  return (
    <div className={classes.root}>
      <AppBar
        position="static"
        style={{ background: "transparent", border: "none" }}
      >
        <Toolbar>
          {/* <IconButton edge="start" className={classes.menuButton} color="inherit" aria-label="menu">
            <MenuIcon />
          </IconButton> */}
          <Typography variant="h6" className={classes.title}>
            <div style={{ verticalAlign: "middle", height: "fit-content" }}>
              <img
                src={SolanaLogo}
                style={{ height: "20px", margin: "0 10px" }}
              />{" "}
              Mint
            </div>
          </Typography>
          {/* <Button size="small" color="inherit" variant="outlined"> */}
          {!wallet ? (
            <ConnectButton
              size="small"
              variant="outlined"
              className="mint_buttons"
            >
              Connect Wallet
            </ConnectButton>
          ) : (
            <ConnectButton
              size="small"
              variant="contained"
              className="mint_buttons"
            >
              {shortenAddress(wallet.publicKey.toBase58() || "")}
            </ConnectButton>
          )}
          {/* </Button> */}
        </Toolbar>
      </AppBar>
      <Grid container style={{ marginTop: "10vh" }}>
        <Grid item xs={12} sm={7}>
          {/* <Paper className={classes.paper}>xs=12 sm=6</Paper> */}
          <p id="main_heading">
            Powerful community for developers. <br />
            <span style={{ color: "#DC1FFF" }}>
              Lorem ipsum dolor sit amet.
            </span>
          </p>
        </Grid>
        <Grid item xs={12} sm={5}>
          {!wallet ? (
            <><img src={ArtMuseum} style={{objectFit:"cover",height:"45vh"}} className="art_museum" /></>
          ) : (
            <>
              <main>
                {wallet && (
                  <div className="info_balance">
                    <div>
                      <AccountBalanceWalletIcon />
                    </div>{" "}
                    <div className="balance_text">
                      {(balance || 0).toLocaleString()}{" "}
                      <span style={{ color: "#DC1FFF" }}>SOL</span>
                    </div>
                  </div>
                )}
                <br />
                <br />
                {wallet && (
                  <>
                    <Chip
                      style={{
                        background: "#03E1FF",
                        padding: "25px",
                        fontSize: "large",
                        margin: "10px 5px",
                        color: "#000",
                      }}
                      label={`${itemsRemaining} out of ${itemsAvailable} Available`}
                    />
                    <br />
                  </>
                )}
                <br />
                <br />
                <MintContainer>
                  {!wallet ? (
                    <></>
                  ) : (
                    <MintButton
                      disabled={isSoldOut || isMinting || !isActive}
                      onClick={onMint}
                      variant="contained"
                      size="small"
                      style={{
                        background: "#DC1FFF",
                        color: "#fff",
                        fontWeight: "bold",
                      }}
                    >
                      {isSoldOut ? (
                        "SOLD OUT"
                      ) : isActive ? (
                        isMinting ? (
                          <CircularProgress />
                        ) : (
                          "MINT ONE"
                        )
                      ) : (
                        <Countdown
                          date={startDate}
                          onMount={({ completed }) =>
                            completed && setIsActive(true)
                          }
                          onComplete={() => setIsActive(true)}
                          renderer={renderCounter}
                        />
                      )}
                    </MintButton>
                  )}
                </MintContainer>

                <Snackbar
                  open={alertState.open}
                  autoHideDuration={6000}
                  onClose={() => setAlertState({ ...alertState, open: false })}
                >
                  <Alert
                    onClose={() =>
                      setAlertState({ ...alertState, open: false })
                    }
                    severity={alertState.severity}
                  >
                    {alertState.message}
                  </Alert>
                </Snackbar>
              </main>
            </>
          )}
        </Grid>
      </Grid>
    </div>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
      {hours + (days || 0) * 24} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};

export default Home;
