package main

import (
	"fmt"

	wapi "github.com/wapikit/wapi.go/pkg/client"
)

func main() {
	// Initialize client with just the required fields
	client := wapi.New(&wapi.ClientConfig{
		BusinessAccountId: "647796864327279",
		ApiAccessToken:    "EAAX7LMIGl80BO1y6kPxnb109OXnljUCDvTbjijobYOsotEPWtbaAGIYHeSBsEmFSckHM7VPgyrLggWY2WBMki3ytt7gHcX2BODdLQhzE1nfpHe53jbNsbh9OzaZB24PVdWuDZAsM7QZATGYA9WFZAZCPZBNTFQDQEcpGQE0EcGZCuCSZCvpRfVkYQv564pfImF3JH7A5BK47wVbZAgb64mlH8VVfrt7V8FZApFdzYZD",
	})

	// Try to fetch phone numbers
	fmt.Println("Fetching phone numbers...")
	phones, err := client.Business.PhoneNumber.FetchAll(true)
	if err != nil {
		fmt.Printf("Error fetching phones: %+v\n", err)
		return
	}

	fmt.Printf("Phone numbers response: %+v\n", phones)
	if phones == nil || len(phones.Data) == 0 {
		fmt.Println("\nNo phone numbers found. This could mean:")
		fmt.Println("1. The business account is not properly set up")
		fmt.Println("2. The API token doesn't have the right permissions")
		fmt.Println("3. There are no phone numbers registered yet")
	}

	// Try to fetch templates
	fmt.Println("\nFetching message templates...")
	templates, err := client.Business.Template.FetchAll()
	if err != nil {
		fmt.Printf("Error fetching templates: %+v\n", err)
		return
	}

	fmt.Printf("Templates response: %+v\n", templates)
	if templates == nil || len(templates.Data) == 0 {
		fmt.Println("\nNo templates found. This could mean:")
		fmt.Println("1. No templates have been created yet")
		fmt.Println("2. The API token doesn't have the right permissions")
		fmt.Println("3. Templates are still pending approval")
	}

	fmt.Println("\nPlease verify:")
	fmt.Println("- Your Business Account ID is correct")
	fmt.Println("- Your API token has the right permissions")
	fmt.Println("- You have completed the WhatsApp Business API setup at https://developers.facebook.com/docs/whatsapp/cloud-api/get-started")
}
