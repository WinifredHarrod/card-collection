"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";

import { CardCollectionAddresses } from "@/abi/CardCollectionAddresses";
import { CardCollectionABI } from "@/abi/CardCollectionABI";

export type ClearPopularityType = {
  handle: string;
  clear: string | bigint | boolean;
};

type CardCollectionInfoType = {
  abi: typeof CardCollectionABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getCardCollectionByChainId(
  chainId: number | undefined
): CardCollectionInfoType {
  if (!chainId) {
    return { abi: CardCollectionABI.abi } as any;
  }
  const entry = (CardCollectionAddresses as any)[
    chainId.toString() as keyof typeof CardCollectionAddresses
  ];
  if (!entry || !("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: CardCollectionABI.abi, chainId } as any;
  }
  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: CardCollectionABI.abi,
  };
}

export const useFHECardCollection = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [popHandle, setPopHandle] = useState<string | undefined>(undefined);
  const [clearPopularity, setClearPopularity] = useState<
    ClearPopularityType | undefined
  >(undefined);
  const clearPopularityRef = useRef<ClearPopularityType>(undefined);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const ccRef = useRef<CardCollectionInfoType | undefined>(undefined);
  const isRefreshingRef = useRef<boolean>(isRefreshing);
  const isDecryptingRef = useRef<boolean>(isDecrypting);
  const isRunningRef = useRef<boolean>(isRunning);

  const isDecrypted = popHandle && popHandle === clearPopularity?.handle;

  const cardCollection = useMemo(() => {
    const c = getCardCollectionByChainId(chainId);
    ccRef.current = c;
    if (!c.address) {
      setMessage(`CardCollection deployment not found for chainId=${chainId}.`);
    }
    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!cardCollection) return undefined as any;
    return Boolean(cardCollection.address) && cardCollection.address !== ethers.ZeroAddress;
  }, [cardCollection]);

  const canGetPopularity = useMemo(() => {
    return cardCollection.address && ethersReadonlyProvider && !isRefreshing;
  }, [cardCollection.address, ethersReadonlyProvider, isRefreshing]);

  const refreshPopularityHandle = useCallback(
    (tokenId: number) => {
      if (isRefreshingRef.current) return;

      if (
        !ccRef.current ||
        !ccRef.current?.chainId ||
        !ccRef.current?.address ||
        !ethersReadonlyProvider
      ) {
        setPopHandle(undefined);
        return;
      }

      isRefreshingRef.current = true;
      setIsRefreshing(true);

      const thisChainId = ccRef.current.chainId;
      const thisAddress = ccRef.current.address;

      const contract = new ethers.Contract(
        thisAddress!,
        ccRef.current.abi,
        ethersReadonlyProvider
      );

      (contract as any)
        .getPopularity(tokenId)
        .then((value: string) => {
          if (sameChain.current(thisChainId) && thisAddress === ccRef.current?.address) {
            setPopHandle(value);
          }
        })
        .catch((e: any) => {
          setMessage("CardCollection.getPopularity() call failed! error=" + e);
        })
        .finally(() => {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
        });
    },
    [ethersReadonlyProvider, sameChain]
  );

  useEffect(() => {
    // no auto refresh without token context
  }, []);

  const canDecrypt = useMemo(() => {
    return (
      cardCollection.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDecrypting &&
      popHandle &&
      popHandle !== ethers.ZeroHash &&
      popHandle !== clearPopularity?.handle
    );
  }, [cardCollection.address, instance, ethersSigner, isRefreshing, isDecrypting, popHandle, clearPopularity]);

  const decryptPopularityHandle = useCallback(() => {
    if (isRefreshingRef.current || isDecryptingRef.current) return;
    if (!cardCollection.address || !instance || !ethersSigner) return;
    if (popHandle === clearPopularityRef.current?.handle) return;
    if (!popHandle) {
      setClearPopularity(undefined);
      clearPopularityRef.current = undefined as any;
      return;
    }
    if (popHandle === ethers.ZeroHash) {
      setClearPopularity({ handle: popHandle, clear: BigInt(0) });
      clearPopularityRef.current = { handle: popHandle, clear: BigInt(0) } as any;
      return;
    }

    const thisChainId = chainId;
    const thisAddress = cardCollection.address;
    const thisHandle = popHandle;
    const thisSigner = ethersSigner;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Start decrypt popularity");

    const run = async () => {
      const isStale = () =>
        thisAddress !== ccRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisSigner);

      try {
        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [thisAddress as `0x${string}`],
          thisSigner,
          fhevmDecryptionSignatureStorage
        );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        setMessage("Call FHEVM userDecrypt...");

        const res = await (instance as any).userDecrypt(
          [{ handle: thisHandle, contractAddress: thisAddress }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        setMessage("FHEVM userDecrypt completed!");

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        setClearPopularity({ handle: thisHandle, clear: (res as any)[thisHandle] });
        clearPopularityRef.current = { handle: thisHandle, clear: (res as any)[thisHandle] } as any;
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [fhevmDecryptionSignatureStorage, ethersSigner, cardCollection.address, instance, popHandle, chainId, sameChain, sameSigner]);

  const canRun = useMemo(() => {
    return cardCollection.address && instance && ethersSigner && !isRefreshing && !isRunning;
  }, [cardCollection.address, instance, ethersSigner, isRefreshing, isRunning]);

  const updatePopularity = useCallback(
    (tokenId: number, delta: number) => {
      if (isRefreshingRef.current || isRunningRef.current) return;
      if (!cardCollection.address || !instance || !ethersSigner || delta === 0) return;

      const thisChainId = chainId;
      const thisAddress = cardCollection.address;
      const thisSigner = ethersSigner;
      const contract = new ethers.Contract(thisAddress!, cardCollection.abi, thisSigner);

      const op = delta > 0 ? "increasePopularity" : "decreasePopularity";
      const valueAbs = delta > 0 ? delta : -delta;

      isRunningRef.current = true;
      setIsRunning(true);
      setMessage(`Start ${op}(${valueAbs})...`);

      const run = async (valueAbs: number) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const isStale = () =>
          thisAddress !== ccRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisSigner);
        try {
          const input = (instance as any).createEncryptedInput(
            thisAddress,
            thisSigner.address
          );
          input.add32(valueAbs);
          const enc = await input.encrypt();

          if (isStale()) {
            setMessage(`Ignore ${op}`);
            return;
          }

          setMessage(`Call ${op}...`);
          const tx: ethers.TransactionResponse = await (contract as any)[op](
            tokenId,
            enc.handles[0],
            enc.inputProof
          );

          setMessage(`Wait for tx:${tx.hash}...`);
          await tx.wait();
          setMessage(`${op} completed`);
        } catch {
          setMessage(`${op} Failed!`);
        } finally {
          isRunningRef.current = false;
          setIsRunning(false);
        }
      };

      run(valueAbs);
    },
    [ethersSigner, cardCollection.address, cardCollection.abi, instance, chainId, sameChain, sameSigner]
  );

  const mint = useCallback(
    async (
      name: string,
      description: string,
      image: string,
      tags: string[]
    ): Promise<ethers.TransactionReceipt | undefined> => {
      if (!cardCollection.address || !ethersSigner) return undefined;
      const contract = new ethers.Contract(
        cardCollection.address,
        cardCollection.abi,
        ethersSigner
      );
      const tx = await (contract as any).mint(name, description, image, tags);
      return await tx.wait();
    },
    [cardCollection.address, cardCollection.abi, ethersSigner]
  );

  const transfer = useCallback(
    async (
      to: string,
      tokenId: number
    ): Promise<ethers.TransactionReceipt | undefined> => {
      if (!cardCollection.address || !ethersSigner) return undefined;
      const contract = new ethers.Contract(
        cardCollection.address,
        cardCollection.abi,
        ethersSigner
      );
      const tx = await (contract as any).collect(to, tokenId);
      return await tx.wait();
    },
    [cardCollection.address, cardCollection.abi, ethersSigner]
  );

  const getMeta = useCallback(
    async (
      tokenId: number
    ): Promise<{ name: string; description: string; image: string; tags: string[] } | undefined> => {
      if (!cardCollection.address || !ethersReadonlyProvider) return undefined;
      const contract = new ethers.Contract(
        cardCollection.address,
        cardCollection.abi,
        ethersReadonlyProvider
      );
      const [name, description, image, tags] = await (contract as any).getCardMeta(tokenId);
      return { name, description, image, tags };
    },
    [cardCollection.address, cardCollection.abi, ethersReadonlyProvider]
  );

  return {
    contractAddress: cardCollection.address,
    isDeployed,
    message,
    // popularity
    canGetPopularity,
    refreshPopularityHandle,
    canDecrypt,
    decryptPopularityHandle,
    isDecrypting,
    isRefreshing,
    handle: popHandle,
    clear: clearPopularity?.clear,
    // ops
    canRun,
    updatePopularity,
    mint,
    transfer,
    getMeta,
  };
};


