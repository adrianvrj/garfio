Soroswap's factory and pair, fetched from testnet so the tests run against the real AMM:

```bash
stellar contract fetch --network testnet -o soroswap_factory.wasm --id CDP3HMUH6SMS3S7NPGNDJLULCOXXEPSHY4JKUKMBNQMATHDHWXRRJTBY
# any pair the factory created; they all run the same code
stellar contract fetch --network testnet -o soroswap_pair.wasm --id CDSQONFE5BS732OYYJINI2L7W4567XRBLJWDD7GPVQZLXLPC4CGA55ZO
```
