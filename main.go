package main

import "net/http"

func main() {
	http.Handle("/", http.FileServer(http.Dir(".")))

	println("Listening on port 5555")
	http.ListenAndServe(":5555", nil)
}
